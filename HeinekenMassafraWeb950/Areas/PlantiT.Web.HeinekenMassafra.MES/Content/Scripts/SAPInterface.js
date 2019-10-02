// App: KendoSAPInterface
var app = angular.module("KendoSAPInterface", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: SAPInterfaceCtrl
app.controller("SAPInterfaceCtrl", ['$scope', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsEnumerationTexts', 'refresh', 'kendoOdsUnits', 'kendoOdsMaterials',

function ($scope, ngDialog, txt, kendoHelper, kendoOdsEnumerationTexts, refresh, kendoOdsUnits, kendoOdsMaterials) {

    // Verweis auf Service      
    $scope.srv_kendoOdsEnumerationTexts = kendoOdsEnumerationTexts;

    // Konstanten
    const TIMEINTERVAL_PER_DAY_MS = 86400000;
    const ENUM_STATUS_HEADER = 'Status_SAPInterfaceValues'; // Text des Status in Headerspalte
    const ENUM_IS_COMPLETE = 'IsComplete_SAPInterfaceHeader'; // Text des Status in Headerspalte
    const EDITABLE_FIELDS_UPDATE_SIH = ['SAP_PO']; // als Array, welche Felder in SAPInterfaceHeader bearbeitbar sind
    const EDITABLE_FIELDS_UPDATE_SIV = ['Value', 'ValueString', 'ValueCombo']; // als Array, welche Felder in SAPInterfaceValues bearbeitbar sind
    const EDITABLE_FIELDS_UPDATE_SIMT = ['SourceAmount', 'Material', 'Unit']; // als Array, welche Felder in SAPInterfaceValues bearbeitbar sind
    const EDITABLE_FIELDS_CREATE_SIMT = ['Material', 'Unit', 'ValueCategory', 'SourceUnitOfMeasurement', 'SourceAmount', 'StartTime']; // als Array, welche Felder in ProcessProductionPerformanceMovements bearbeitbar sind
    const STATUS_SIH_WAITING = 0;
    const STATUS_SIH_READYFORSEND = 1;
    const STATUS_SIH_OK = 3;
    const STATUS_SIH_ERROR = 4;
    const STATUS_SIH_MANUAL_OK = 5;

    const TIMEOUT_DELAY_DATABOUND = 500; // notwendig um doppeltes Aufrufen zu vermeiden
    const Classification = ';MANUAL_INPUT;';

    const MATERIAL_DEFAULT_KEY = 83000000000;
    const UNIT_DEFAULT_KEY = 81200000000;
    const ENTERPRISE_DEFAULT_KEY = 7000000000;



    // Datenquellen
    $scope.dataSourceEnumerationTexts = kendoOdsEnumerationTexts.getDataSource;


    // Aktualisieren des Treeview      
    var m_expandedRows = undefined;
    var m_selectedRows = undefined;

    var m_timeoutSAPInterfaceHeaderHandle = null;
    var m_timeoutSAPInterfaceValueHandle = new Array();
    var m_timeoutSAPInterfaceMaterialTransfersHandle = new Array();
    var m_timeoutSAPInterfaceManualInputHandle = new Array();

    // Struktur: dataSourceElement 
    function c_dataSourceElement(dataItem, dataSource) {
        this.dataItem = dataItem;
        this.dataSource = dataSource;
    };


    // interne Variablen                       
    var m_IsRefreshDelayDialogVisible = false;

    var m_dataValuesInitialized = false;
    var m_dataSourceSAPInterfaceInitialized = false;
    var m_dataValuesTabInitialized = false;
    var m_dataManualInputTabInitialized = false;
    var m_dataMatTransfTabInitialized = false;

    var m_ManualInputDSRead = false;
    var m_ValueInputDSRead = false;

    var m_dataSourceSAPInterfaceValuesElements = new Array(); // Array mit allen datasource Elementen die in Grid SAPInterfaceValues bereits gelesen wurden
    var m_dataSourceSAPInterfaceMaterialTransfersElements = new Array(); // Array mit allen datasource Elementen die in Grid SAPInterfaceMaterialTransfers bereits gelesen wurden
    var m_dataSourceSAPInterfaceManualInputElements = new Array(); // Array mit allen datasource Elementen die in Grid SAPInterfaceManualInput bereits gelesen wurden    

    var m_selectedtabStripSAPInterfaceHeaders = [];

    var m_pdfExportRunning = false;



    // -------------------------
    // Datenquelle des Grids: SAPInterfaceHeader
    var m_dataSourceSAPInterfaceHeaders = new kendo.data.DataSource({
        type: "odata-v4",
        transport: {
            read: {
                url: $("#gatewayPath").data("value") + "odata/ods/ZWebSAPInterfaceStatuses?$select=_Key,_BatchKey,BatchProcessStartTime,CurrentStep,BatchName,MaterialLocalName,MaterialGlobalName,Comment,SAP_PO,StatusPO,StatusPP,StatusQM,ErrorPO,ErrorPP,ErrorQM,POSent,PPSent,QMSent,IsLocked,IsComplete,SAP_Batch,Brewline",
                datatype: 'json',
                beforeSend: function (x) {
                    var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                    x.setRequestHeader("Authorization", auth);
                },
                cache: false
            },
            update: {
                url: function (data) {
                    return $("#gatewayPath").data("value") + "odata/ods/ZWebSAPInterfaceStatuses(" + data._Key + ")";
                },
                dataType: "json",
                type: "PATCH",
                beforeSend: function (x) {
                    var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                    x.setRequestHeader("Authorization", auth);
                },
            },
            parameterMap: function (data, operation) {
                if (operation === "update") {
                    if (data._Kendo_SaveIt == 1) {
                        data._Kendo_SaveIt = 0;
                        return '{  "_Key": "' + data._Key +
                            '", "Comment": "' + data.Comment +
                            '","IsLocked": "' + ((data.IsLocked) ? 1 : 0) +
                            '", "SAP_PO": "' + data.SAP_PO +
                            '","StatusPO": ' + ((data.StatusPO == null) ? null : '"' + data.StatusPO + '"') +
                            ',"StatusPP": ' + ((data.StatusPP == null) ? null : '"' + data.StatusPP + '"') +
                            ',"StatusQM": ' + ((data.StatusQM == null) ? null : '"' + data.StatusQM + '"') +
                            ',"POSent": "' + kendoHelper.getUTCDate(new Date(data.POSent)) +
                            '","PPSent": "' + kendoHelper.getUTCDate(new Date(data.PPSent)) +
                            '","QMSent": "' + kendoHelper.getUTCDate(new Date(data.QMSent)) +
                            '"}';
                    }
                }
                if (operation === "read") {
                    var dataToRead = data;

                    // Filteranpassungen vor Abfrageerstellung
                    if (dataToRead.filter && dataToRead.filter.filters) {
                        for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                            if (dataToRead.filter.filters[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                dataToRead.filter.filters[i].field = "MaterialLocalName";
                            if (dataToRead.filter.filters[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                dataToRead.filter.filters[i].field = "MaterialGlobalName";
                            else if (dataToRead.filter.filters[i].logic == "or") {
                                for (var j = 0; j < dataToRead.filter.filters[i].filters.length; j++) {
                                    if (dataToRead.filter.filters[i].filters[j].field == "IsComplete") {
                                        dataToRead.filter.filters[i].filters[j].field == "IsComplete";
                                    }
                                }
                            }
                        }
                    }

                    // Abfrageerstellung ausführen
                    var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
                    result.$count = true;
                    delete result.$inlinecount;

                    // Filteranpassungen nach Abfrageerstellung
                    if (result.$filter) {
                        result.$filter = result.$filter.replace(/BatchProcessStartTime/g, "cast(BatchProcessStartTime, Edm.DateTimeOffset)");
                    }

                    return result;
                }
            }
        },
        change: function (e) {
            // Daten ermitteln
            var view = this.view();

            if (!view) return;

            var dataItem = view[0];

            if (!dataItem) return;

        },
        requestStart: function (e) {
            // Wenn noch nicht initialisiert, abbruch
            if (!m_dataValuesInitialized || !m_dataSourceSAPInterfaceInitialized) {
                e.preventDefault();

                // Datenquelle wurde initialisiert
                m_dataSourceSAPInterfaceInitialized = true;
            }
        },
        schema: {
            model: {
                id: "_Key",
                fields: {"_Key": {type: "string"},
                    "Brewline": {type: "string"},
                    "Excel": {type: "string",parse: function (value) {return "";}},
                    "_BatchKey": {type: "number"},
                    "BatchProcessStartTime": {type: "date"},
                    "CurrentStep": {type: "string"},
                    "BatchName": { type: "string", parse: function (value) { return value.substring(0, value.indexOf(".")) }, editable: false },
                    "Material": {field: "Material",type: "string",parse: function (value) {return value || {}},editable: false}, 
                    "MaterialLocalName": {type: "string"},
                    "MaterialGlobalName": {type: "string"},
                    "Comment": {type: "string",defaultValue: ''},
                    "SAP_PO": {type: "number"},
                    "SAP_Batch": {type: "string"},
                    "StatusPO": {type: "enums"},
                    "StatusPP": {type: "enums"},
                    "StatusQM": {type: "enums"},
                    "ErrorPO": {type: "string"},
                    "ErrorPP": {type: "string"},
                    "ErrorQM": {type: "string"},
                    "POSent": {type: "date",parse: function (value) {return (value === undefined || value === null) ? null : value;}},
                    "PPSent": {type: "date",parse: function (value) {return (value === undefined || value === null) ? null : value;}},
                    "QMSent": {type: "date",parse: function (value) {return (value === undefined || value === null) ? null : value;}},
                    "IsLocked": {type: "boolean",parse: function (value) {return (value == "0") ? false : true;}},
                    "IsComplete": {type: "number"},
                    "Command": {type: "string",parse: function (value) {return 0;}},
                    "_Kendo_SaveIt": {type: "number",parse: function (value) {return 0;}},
                }
            }
        },
        batch: false,
        pageSize: 10,
        serverPaging: true,
        serverSorting: true,
        serverFiltering: true
    });



    // -------------------------
    // Datenquelle des Grids: SAPInterfaceValues (Hilfsfunktion)
    // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
    var f_GetDataSourceSAPInterfaceValues = function (dataItem) {
        if (!m_dataSourceSAPInterfaceValuesElements) m_dataSourceSAPInterfaceValuesElements = new Array();
        // wenn gefunden, entsprechendes Element zurückgeben
        for (var i = 0; i < m_dataSourceSAPInterfaceValuesElements.length; i++) {
            if (m_dataSourceSAPInterfaceValuesElements[i].dataItem._Key == dataItem._Key) return m_dataSourceSAPInterfaceValuesElements[i].dataSource;
        }
        // Element anlegen
        var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceSAPInterfaceValuesElement());

        m_ValueInputDSRead = false;

      // Filter/Sortierung setzen
        kendoHelper.setDataSourceFilters(newElement.dataSource, "_BatchKey", "eq", parseInt(dataItem._BatchKey));
        kendoHelper.setDataSourceSorts(newElement.dataSource, "SortOrder", "asc");
        m_ValueInputDSRead = true;

        // Element hinzufügen
        m_dataSourceSAPInterfaceValuesElements.push(newElement);
        return newElement.dataSource;
    };

    // Datenquelle des Grids: SAPInterfaceValues 
    var m_dataSourceSAPInterfaceValues_ReadRunning = false;
    var f_GetDataSourceSAPInterfaceValuesElement = function () {
        var ds = {
            type: "odata-v4",
            transport: {
                read: {
                  url: $("#gatewayPath").data("value") + "odata/ods/ZWebSAPInterfaceStatusValues?$select=_Key,_BatchKey,_UnitKey,UnitGlobalName,UnitLocalName,RecordingTime,UnitOfMeasurement,Value,ValueString,ValueCategoryLocalName,ValueCategoryGlobalName,ValueOriginal,ValueStringOriginal,LowerLimit,LowerVetoLimit,UpperLimit,UpperVetoLimit,Comment,Format,TargetUoM,_EnumerationLink,EnumerationTextGlobalName,EnumerationTextLocalName",
                    datatype: 'json',
                    beforeSend: function (xhr) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        xhr.setRequestHeader("Authorization", auth);
                    },
                    cache: false
                },

                update: {
                    url: function (data) {
                        return $("#gatewayPath").data("value") + "odata/ods/ZWebSAPInterfaceStatusValues(" + data._Key + ")?$select=_Key,Value,ValueString,Comment";
                    },
                    dataType: "json",
                    type: "PATCH",
                    beforeSend: function (x) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        x.setRequestHeader("Authorization", auth);
                    }
                },
                parameterMap: function (data, operation) {
                    if (operation === "update") {
                        if (data._Kendo_SaveIt == 1) {
                            data._Kendo_SaveIt = 0;

                            var value = "";

                            if (data.ValueString != null && $.isNumeric(data.ValueString.replace(",", "."))) {
                                value = '"' + parseFloat(data.ValueString.replace(",", ".")) + '"';
                            } else {
                                if ((data._EnumerationLink && typeof (data.ValueCombo.TextNumber) != String)) {
                                    value = '"' + data.ValueCombo.TextNumber + '"';
                                } else if ((data.Value || data.Value == 0) && data.Value != null) {
                                    value = '"' + data.Value + '"';
                                }
                                else {
                                    value = 'null';
                                }
                            }

                            return '{ "_Key": "' + data._Key +
                                '", "Comment": "' + data.Comment +
                                '","Value": ' + value +
                                ',"ValueString": ' + (data.ValueString != null ? ($.isNumeric(data.ValueString.replace(",", ".")) ? 'null' : '"' + data.ValueString + '"') : 'null') +
                                '}';
                        }
                    }

                    if (operation === "read") {

                        // Wird etwas von DB angefordert?
                        m_dataSourceSAPInterfaceValues_ReadRunning = true;

                        var dataToRead = data;

                        // Filteranpassungen vor Abfrageerstellung
                        if (dataToRead.filter && dataToRead.filter.filters) {
                            for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                                if (!!dataToRead.filter.filters[i].field) {
                                    if (dataToRead.filter.filters[i].field == "ValueOriginal" && this.options.dataSource._data[i].ValueOriginal)
                                        dataToRead.filter.filters[i].field = "ValueOriginal";
                                    if (dataToRead.filter.filters[i].field == "ValueOriginal" && this.options.dataSource._data[i].ValueStringOriginal)
                                        dataToRead.filter.filters[i].field = "ValueStringOriginal";
                                    if (dataToRead.filter.filters[i].field == "ValueName" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                        dataToRead.filter.filters[i].field = "ValueCategoryLocalName";
                                    if (dataToRead.filter.filters[i].field == "ValueName" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                        dataToRead.filter.filters[i].field = "ValueCategoryGlobalName";
                                    if (dataToRead.filter.filters[i].field == "IsComplete")
                                        dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value); // damit Nummer abgefragt wird        
                                }
                            }
                        }

                        // Sortieranpassungen vor Abfrageerstellung
                        if (!!dataToRead.sort) {
                            for (var i = 0; i < dataToRead.sort.length; i++) {
                                if (dataToRead.sort[i].field == "ValueName" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                    dataToRead.sort[i].field = "ValueCategoryLocalName";
                                if (dataToRead.sort[i].field == "ValueName" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                    dataToRead.sort[i].field = "ValueCategoryGlobalName";
                            }
                        }

                        // Abfrageerstellung ausführen
                        var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
                        result.$count = true;
                        delete result.$inlinecount;

                        // Filteranpassungen nach Abfrageerstellung
                        if (result.$filter) {
                            result.$filter = result.$filter.replace(/BatchProcessStartTime/g, "cast(BatchProcessStartTime, Edm.DateTimeOffset)");
                        }
                        return result;
                    }
                }
            },

            change: function (e) {
                //      Combobox Objekt versorgen
                var data = this._data;

                if (m_dataSourceSAPInterfaceValues_ReadRunning) {
                    m_dataSourceSAPInterfaceValues_ReadRunning = false;

                    for (var i = 0; i < data.length; i++) {
                        if (data[i]._EnumerationLink) {
                            data[i].ValueCombo = new kendo.data.ObservableObject({
                                TextNumber: data[i].Value,
                                EnumerationTextLocalName: data[i].EnumerationTextLocalName,
                                EnumerationTextGlobalName: data[i].EnumerationTextGlobalName,
                            });
                        }
                    }
                }
            },
            requestStart: function (e) {
                // Wenn noch nicht initialisiert, abbruch
              if (!m_dataValuesTabInitialized || !m_ValueInputDSRead) {
                    e.preventDefault();

                    // Datenquelle wurde initialisiert
                    m_dataValuesTabInitialized = true;
                }
            },
            schema: {
                model: {
                    id: "_Key",
                    fields: {
                        "_Key": { type: "number" },
                        "_BatchKey": { type: "number" },
                        "_UnitKey": { type: "string", parse: function (value) { return (!!value || value != null) ? value : 0 } },
                        "UnitLocalName": { type: "string", parse: function (value) { return (!!value || value != null) ? value : "Undefined" } },
                        "UnitGlobalName": { type: "string", parse: function (value) { return (!!value || value != null) ? value : "Undefined" } },
                        "RecordingTime": { type: "date" },
                        "UnitOfMeasurement": { type: "string", defaultValue: 'HLT' },
                        "Value": { type: "number" },
                        "TargetUoM": { type: "string" },
                        "_EnumerationLink": { type: "string" },
                        "EnumerationTextLocalName": { type: "string", parse: function (value) { return (value === null) ? "" : value; } },
                        "EnumerationTextGlobalName": { type: "string", parse: function (value) { return (value === null) ? "" : value; } },
                        "ValueCombo": { type: "string", parse: function (value) { return (value === undefined) ? { TextNumber: undefined, EnumerationTextLocalName: "", EnumerationTextGlobalName: "" } : value; }, },
                        "ValueString": { type: "string" },
                        "ValueStringOriginal": { type: "string" },
                        "ValueOriginal": { type: "number" },
                        "ValueName": { type: "string", parse: function (value) { return (value === undefined || value === null) ? {} : value; } },
                        "ValueCategoryLocalName": { type: "string" },
                        "ValueCategoryGlobalName": { type: "string" },
                        "LowerLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
                        "LowerVetoLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
                        "UpperLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
                        "UpperVetoLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
                        "Comment": { type: "string", defaultValue: '' },
                        "Command": { type: "string", parse: function (value) { return 0; } },
                        "Format": { type: "number", parse: function (value) { return (value === null) ? 0 : value; } },
                        "_Kendo_SaveIt": { type: "number", defaultValue: 0, parse: function (value) { return 0; } },
                    }
                }
            },
            batch: false,
            pageable: false,
            serverPaging: false,
            serverSorting: true,
            serverFiltering: true,
            autoBind: false,

            group: {
                field: ""
            }
        };


        if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
            ds.group.field = "UnitGlobalName";
        } else {
            ds.group.field = "UnitLocalName";
        }
        ds = new kendo.data.DataSource(ds);
        return ds;
    };


    // -------------------------
    // Datenquelle des Grids: SAPInterfaceMaterialTransfers (Hilfsfunktion)
    // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
    var f_GetDataSourceSAPInterfaceMaterialTransfers = function (dataItem) {
        if (!m_dataSourceSAPInterfaceMaterialTransfersElements) m_dataSourceSAPInterfaceMaterialTransfersElements = new Array();
        // wenn gefunden, entsprechendes Element zurückgeben
        for (var i = 0; i < m_dataSourceSAPInterfaceMaterialTransfersElements.length; i++) {
            if (m_dataSourceSAPInterfaceMaterialTransfersElements[i].dataItem._Key == dataItem._Key) return m_dataSourceSAPInterfaceMaterialTransfersElements[i].dataSource;
        }
        // Element anlegen
        var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceSAPInterfaceMaterialTransfersElement());

        // Filter setzen
        kendoHelper.setDataSourceFilters(newElement.dataSource, "_TransferBatchKey", "eq", parseInt(dataItem._BatchKey));

        // Element hinzufügen
        m_dataSourceSAPInterfaceMaterialTransfersElements.push(newElement);
        return newElement.dataSource;
    };


    // Datenquelle des Grids: SAPInterfaceMaterialTransfers 
    var f_GetDataSourceSAPInterfaceMaterialTransfersElement = function () {
        var ds = {
            type: "odata-v4",
            transport: {
                read: {
                    url: $("#gatewayPath").data("value") + "odata/ods/ZWebTransferSources?$expand=Material($select=_Key,MaterialLocalName,MaterialGlobalName),Unit($select=_Key,UnitLocalName,UnitGlobalName)&$select=_Key,_TransferBatchKey,MaterialGlobalName,MaterialLocalName,UnitGlobalName,UnitLocalName,SourceUnitOfMeasurement,SourceAmount,StartTime,Comment,_Name,_EnterpriseKey,_SourceMaterialKey,_SourceUnitKey,EmptyFlag",
                    datatype: 'json',
                    beforeSend: function (xhr) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        xhr.setRequestHeader("Authorization", auth);
                    },
                    cache: false
                },
                create: {
                    url: function (data) {
                        return $("#gatewayPath").data("value") + "odata/ods/ZWebTransferSources?$expand=Material($select=_Key,MaterialLocalName,MaterialGlobalName),Unit($select=_Key,UnitLocalName,UnitGlobalName)&$select=_Key,_TransferBatchKey,MaterialGlobalName,MaterialLocalName,UnitGlobalName,UnitLocalName,SourceUnitOfMeasurement,SourceAmount,StartTime,Comment,_Name,_EnterpriseKey,_SourceMaterialKey,_SourceUnitKey,EndTime,DestinationValueTimestamp,SourceValueTimestamp,EmptyFlag";
                    },
                    dataType: "json",
                    type: "POST",
                    beforeSend: function (x) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        x.setRequestHeader("Authorization", auth);
                    }
                },
                update: {
                    url: function (data) {
                        return $("#gatewayPath").data("value") + "odata/ods/ZWebTransferSources(" + data._Key + ")?$expand=Material($select=_Key,MaterialLocalName,MaterialGlobalName),Unit($select=_Key,UnitLocalName,UnitGlobalName)&$select=_Key,_TransferBatchKey,SourceAmount,Comment,_Name,_SourceMaterialKey,_SourceUnitKey,EmptyFlag";
                    },
                    dataType: "json",
                    type: "PATCH",
                    beforeSend: function (x) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        x.setRequestHeader("Authorization", auth);
                    }
                },
                destroy: {
                    url: function (data) {
                        return $("#gatewayPath").data("value") + "odata/ods/ZWebTransferSources(" + data._Key + ")";
                    },
                    dataType: "json",
                    type: "DELETE",
                    beforeSend: function (x) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        x.setRequestHeader("Authorization", auth);
                    }
                },
                parameterMap: function (data, operation) {
                    if (operation === "create" && !!data._TransferBatchKey) {
                        return '{ "Comment": "' + ((!data.Comment) ? "" : data.Comment) +
                            '","SourceAmount": "' + ((data.SourceAmount == null) ? 0 :  data.SourceAmount) +
                            '","_EnterpriseKey": "' + ENTERPRISE_DEFAULT_KEY +
                            '", "_Name": "' + makeId() +
                            '","_SourceMaterialKey": "' + ((!data.Material) ? MATERIAL_DEFAULT_KEY : data.Material._Key) +
                            '","_SourceUnitKey": "' + ((!data.Unit) ? UNIT_DEFAULT_KEY : data.Unit._Key) +
                            '","SourceUnitOfMeasurement": "' + ((!data.SourceUnitOfMeasurement) ? "" : data.SourceUnitOfMeasurement) +
                            '","StartTime": "' + kendoHelper.getUTCDate(new Date(data.StartTime)) +
                            '","EndTime": "' + kendoHelper.getUTCDate(new Date()) +
                            '","DestinationValueTimestamp": "' + kendoHelper.getUTCDate(new Date()) +
                            '","SourceValueTimestamp": "' + kendoHelper.getUTCDate(new Date()) +
                            '","_TransferBatchKey": "' + data._TransferBatchKey +
                            '","EmptyFlag": "' + ((data.EmptyFlag) ? "1" : "0") +
                            '"}';
                    }
                    else if (operation === "update") {
                        if (data._Kendo_SaveIt == 1) {
                            data._Kendo_SaveIt = 0;
                            return '{ "_Key": "' + data._Key +
                                '", "Comment": "' + data.Comment +
                                '","_Name": "' + data._Name +
                                '","_SourceMaterialKey": "' + ((!data.Material) ? MATERIAL_DEFAULT_KEY : data.Material._Key) +
                                '","_SourceUnitKey": "' + ((!data.Unit) ? UNIT_DEFAULT_KEY : data.Unit._Key) +
                                '","SourceAmount": "' + ((data.SourceAmount == null || data.SourceAmount == "") ? 0 :  data.SourceAmount) +
                                '","EmptyFlag": "' + ((data.EmptyFlag) ? "1" : "0") +
                                '"}';
                        }
                    }
                    else if (operation === "read") {
                        var dataToRead = data;

                        // Filteranpassungen vor Abfrageerstellung
                        if (dataToRead.filter && dataToRead.filter.filters) {
                            for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                                if (!!dataToRead.filter.filters[i].field) {
                                    if (dataToRead.filter.filters[i].field == "Unit" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                        dataToRead.filter.filters[i].field = "UnitLocalName";
                                    else if (dataToRead.filter.filters[i].field == "Unit" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                        dataToRead.filter.filters[i].field = "UnitGlobalName";
                                    else if (dataToRead.filter.filters[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                        dataToRead.filter.filters[i].field = "MaterialLocalName";
                                    else if (dataToRead.filter.filters[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                        dataToRead.filter.filters[i].field = "MaterialGlobalName";
                                }
                            }
                        }

                        // Sortieranpassungen vor Abfrageerstellung
                        if (!!dataToRead.sort) {
                            for (var i = 0; i < dataToRead.sort.length; i++) {
                                if (dataToRead.sort[i].field == "Unit" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                    dataToRead.sort[i].field = "Unit/UnitLocalName";
                                else if (dataToRead.sort[i].field == "Unit" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                    dataToRead.sort[i].field = "Unit/UnitGlobalName";
                                else if (dataToRead.sort[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                    dataToRead.sort[i].field = "Material/MaterialLocalName";
                                else if (dataToRead.sort[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                    dataToRead.sort[i].field = "Material/MaterialGlobalName";
                            }
                        }

                        // Abfrageerstellung ausführen
                        var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
                        result.$count = true;
                        delete result.$inlinecount;

                        // Filteranpassungen nach Abfrageerstellung
                        if (result.$filter) {
                            result.$filter = result.$filter.replace(/StartTime/g, "cast(StartTime, Edm.DateTimeOffset)");
                        }

                        return result;
                    }
                }
            },
            requestStart: function (e) {
                // Wenn noch nicht initialisiert, abbruch
                if (!m_dataMatTransfTabInitialized) {
                    e.preventDefault();

                    // Datenquelle wurde initialisiert
                    m_dataMatTransfTabInitialized = true;
                }
            },
            schema: {
                model: {
                    id: "_TransferBatchKey",
                    fields: {
                        "_Key": { type: "number" },
                        "_TransferBatchKey": { type: "number" },
                        "_Name": { type: "string" },
                        "_EnterpriseKey": { type: "number" },
                        "Enterprise": { field: "Enterprise", type: "string", parse: function (value) { return value || {} } },
                        "Material": { field: "Material", type: "string", parse: function (value) { return value || {} } },
                        "MaterialLocalName": { field: "Material.MaterialLocalName", type: "string" },
                        "MaterialGlobalName": { field: "Material.MaterialGlobalName", type: "string" },
                        "Unit": { field: "Unit", type: "string", parse: function (value) { return value || {} } },
                        "UnitLocalName": { field: "Unit.UnitLocalName", type: "string" },
                        "UnitGlobalName": { field: "Unit.UnitGlobalName", type: "string" },
                        "SourceUnitOfMeasurement": { type: "string", defaultValue: 'HLT' },
                        "SourceAmount": { type: "number" },
                        "StartTime": { type: "date" },
                        "EndTime": { type: "date" },
                        "DestinationValueTimestamp": { type: "date" },
                        "SourceValueTimestamp": { type: "date" },
                        "Comment": { type: "string", defaultValue: '' },
                        "EmptyFlag": { type: "boolean", parse: function (value) { return (value == "0") ? false : true; } },
                        "Command": { type: "string", parse: function (value) { return 0; }, editable: false },
                        "_Kendo_SaveIt": { type: "number", defaultValue: 0, parse: function (value) { return 0; } }
                    }
                }
            },
            batch: false,
            pageable: false,
            serverPaging: false,
            serverSorting: true,
            serverFiltering: true,
        };

        ds = new kendo.data.DataSource(ds);
        return ds;
    };

    // -------------------------
    // Datenquelle des Grids: SAPInterfaceManualInput (Hilfsfunktion)
    // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
    var f_GetDataSourceSAPInterfaceManualInput = function (dataItem) {
        if (!m_dataSourceSAPInterfaceManualInputElements) m_dataSourceSAPInterfaceManualInputElements = new Array();
        // wenn gefunden, entsprechendes Element zurückgeben
        for (var i = 0; i < m_dataSourceSAPInterfaceManualInputElements.length; i++) {
            if (m_dataSourceSAPInterfaceManualInputElements[i].dataItem._Key == dataItem._Key) return m_dataSourceSAPInterfaceManualInputElements[i].dataSource;
        }
        // Element anlegen
        var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceSAPInterfaceManualInputElement());

        // Filter/Sortierung setzen
        m_ManualInputDSRead = false;
        kendoHelper.setDataSourceFilters(newElement.dataSource, "_BatchKey", "eq", parseInt(dataItem._BatchKey));
      // Sortierung setzen
        kendoHelper.setDataSourceSorts(newElement.dataSource, "SortOrder", "asc");
        m_ManualInputDSRead = true;
        // Element hinzufügen
        m_dataSourceSAPInterfaceManualInputElements.push(newElement);
        return newElement.dataSource;
    };

    var m_dataSourceSAPInterfaceManualValues_ReadRunning = false;
    // Datenquelle des Grids: SAPInterfaceManualInput 
    var f_GetDataSourceSAPInterfaceManualInputElement = function () {
        var ds = {
            type: "odata-v4",
            transport: {
                read: {
                    url: $("#gatewayPath").data("value") + "odata/ods/ZWebSAPInterfaceStatusValues?$select=_Key,_BatchKey,_UnitKey,UnitGlobalName,RecordingTime,UnitOfMeasurement,Value,ValueString,ValueCategoryLocalName,ValueCategoryGlobalName,ValueOriginal,ValueStringOriginal,LowerLimit,LowerVetoLimit,UpperLimit,UpperVetoLimit,Comment,Format,TargetUoM,_EnumerationLink,EnumerationTextGlobalName,EnumerationTextLocalName,SortOrder",
                    datatype: 'json',
                    beforeSend: function (xhr) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        xhr.setRequestHeader("Authorization", auth);
                    },
                    cache: false
                },

                update: {
                    url: function (data) {
                        return $("#gatewayPath").data("value") + "odata/ods/ZWebSAPInterfaceStatusValues(" + data._Key + ")?$select=_Key,Value,ValueString,Comment";
                    },
                    dataType: "json",
                    type: "PATCH",
                    beforeSend: function (x) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        x.setRequestHeader("Authorization", auth);
                    }
                },
                parameterMap: function (data, operation) {
                    if (operation === "update") {
                        if (data._Kendo_SaveIt == 1) {
                            data._Kendo_SaveIt = 0;

                            var value = "";

                            if (data.ValueString != null && $.isNumeric(data.ValueString.replace(",", "."))) {
                                     value = '"' + parseFloat(data.ValueString.replace(",", ".")) + '"';
                            } else {
                                if ((data._EnumerationLink && typeof (data.ValueCombo.TextNumber) != String)) {
                                    value = '"' + data.ValueCombo.TextNumber + '"';
                                } else if ((data.Value || data.Value == 0) && data.Value != null) {                           
                                    value = '"' + data.Value + '"';
                                }
                                else {
                                    value = 'null';
                                }
                            }

                            return '{ "_Key": "' + data._Key +
                                '", "Comment": "' + data.Comment +
                                '","Value": ' + value +
                                ',"ValueString": ' + (data.ValueString != null ? ($.isNumeric(data.ValueString.replace(",", ".")) ? 'null' : '"' + data.ValueString + '"') : 'null') +
                                '}';
                        }
                    }
                    if (operation === "read") {
                        var dataToRead = data;

                        m_dataSourceSAPInterfaceManualValues_ReadRunning = true;

                        // Filteranpassungen vor Abfrageerstellung
                        if (dataToRead.filter && dataToRead.filter.filters) {
                            for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                                if (!!dataToRead.filter.filters[i].field) {
                                    if (dataToRead.filter.filters[i].field == "ValueOriginal" && this.options.dataSource._data[i].ValueOriginal)
                                        dataToRead.filter.filters[i].field = "ValueOriginal";
                                    if (dataToRead.filter.filters[i].field == "ValueOriginal" && this.options.dataSource._data[i].ValueStringOriginal)
                                        dataToRead.filter.filters[i].field = "ValueStringOriginal";
                                    if (dataToRead.filter.filters[i].field == "ValueName" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                        dataToRead.filter.filters[i].field = "ValueCategoryLocalName";
                                    if (dataToRead.filter.filters[i].field == "ValueName" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                        dataToRead.filter.filters[i].field = "ValueCategoryGlobalName"; if (dataToRead.filter.filters[i].field == "IsComplete")
                                        dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value); // damit Nummer abgefragt wird        
                                }
                            }
                        }

                        // Sortieranpassungen vor Abfrageerstellung
                        if (!!dataToRead.sort) {
                            for (var i = 0; i < dataToRead.sort.length; i++) {
                                if (dataToRead.sort[i].field == "ValueName" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                    dataToRead.sort[i].field = "ValueCategoryLocalName";
                                if (dataToRead.sort[i].field == "ValueName" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                    dataToRead.sort[i].field = "ValueCategoryGlobalName";
                            }
                        }

                        // Abfrageerstellung ausführen
                        var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
                        result.$count = true;
                        delete result.$inlinecount;

                        // Filteranpassungen nach Abfrageerstellung
                        if (result.$filter) {
                            result.$filter = result.$filter.replace(/BatchProcessStartTime/g, "cast(BatchProcessStartTime, Edm.DateTimeOffset)");
                        }
                        return result;
                    }
                }
            },

            filter: {field: "Classifications", operator: "contains", value: Classification},

            change: function (e) {
                //      Combobox Objekt versorgen
                var data = this._data;

                if (m_dataSourceSAPInterfaceManualValues_ReadRunning) {
                    m_dataSourceSAPInterfaceManualValues_ReadRunning = false;

                    for (var i = 0; i < data.length; i++) {
                        if (data[i]._EnumerationLink) {
                            data[i].ValueCombo = new kendo.data.ObservableObject({
                                TextNumber: data[i].Value,
                                EnumerationTextLocalName: data[i].EnumerationTextLocalName,
                                EnumerationTextGlobalName: data[i].EnumerationTextGlobalName,
                            });
                        }
                    }
                }
            },
            requestStart: function (e) {
                // Wenn noch nicht initialisiert, abbruch
              if (!m_dataManualInputTabInitialized || !m_ManualInputDSRead) {
                    e.preventDefault();

                    // Datenquelle wurde initialisiert
                    m_dataManualInputTabInitialized = true;
                }
            },
            schema: {
                model: {
                    id: "_Key",
                    fields: {
                        "_Key": { type: "number" },
                        "_BatchKey": { type: "number" },
                        "_UnitKey": { type: "string", parse: function (value) { return (!!value || value != null) ? value : 0 } },
                        "UnitLocalName": { type: "string", parse: function (value) { return (!!value || value != null) ? value : "Undefined" } },
                        "UnitGlobalName": { type: "string", parse: function (value) { return (!!value || value != null) ? value : "Undefined" } },
                        "RecordingTime": { type: "date" },
                        "UnitOfMeasurement": { type: "string", defaultValue: 'HLT' },
                        "Value": { type: "number" },
                        "TargetUoM": { type: "string" },
                        "_EnumerationLink": { type: "string" },
                        "EnumerationTextLocalName": { type: "string", parse: function (value) { return (value === null) ? "" : value; } },
                        "EnumerationTextGlobalName": { type: "string", parse: function (value) { return (value === null) ? "" : value; } },
                        "ValueCombo": { type: "string", parse: function (value) { return (value === undefined) ? { TextNumber: undefined, EnumerationTextLocalName: "", EnumerationTextGlobalName: "" } : value; }, },
                        "ValueString": { type: "string" },
                        "ValueStringOriginal": { type: "string" },
                        "ValueOriginal": { type: "number" },
                        "ValueName": { type: "string", parse: function (value) { return (value === undefined || value === null) ? {} : value; } },
                        "ValueCategoryLocalName": { type: "string" },
                        "ValueCategoryGlobalName": { type: "string" },
                        "LowerLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
                        "LowerVetoLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
                        "UpperLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
                        "UpperVetoLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
                        "Comment": { type: "string", defaultValue: '' },
                        "Command": { type: "string", parse: function (value) { return 0; } },
                        "Format": { type: "number", parse: function (value) { return (value === null) ? 0 : value; } },
                        "_Kendo_SaveIt": { type: "number", defaultValue: 0, parse: function (value) { return 0; } },
                    }
                }
            },
            batch: false,
            pageable: false,
            serverPaging: false,
            serverSorting: true,
            serverFiltering: true,

        };

        ds = new kendo.data.DataSource(ds);
        return ds;
    };


    // interne Funktionen

    // Refresh events
    var f_OnAutomaticRefreshElapsed = function () {
        // Ermittle aktuelle Seite
        var actualSAPInterfaceHeadersPage = $scope.gridSAPInterfaceHeaders.pager.dataSource.page();

        // Nur wenn auf Seite 1 die Aktualisierung anstoßen
        if (!actualSAPInterfaceHeadersPage || actualSAPInterfaceHeadersPage == 1) {
            // aktualisieren
            $scope.OnGridSAPInterfaceRefresh();
        }
    };

    var f_OnAutomaticRefreshDelayElapsed = function () {
        // Dialog ist ab jetzt sichtbar
        if (m_IsRefreshDelayDialogVisible) return;
        m_IsRefreshDelayDialogVisible = true;


        var dlg = ngDialog.open({
            template: 'modalDialogAutomaticRefreshDelayElapsedTemplate',
            scope: $scope
        });
        dlg.closePromise.then(function (data) {
            try {
                // nur wenn Automatische Aktualisierung aktiv ist    
                // Antwort: continue
                if (data.value == 0) {
                    if ($scope.checkBoxAutomaticRefreshValue == 1) refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
                }
                    // Antwort: save and continue
                else if (data.value == 1) {
                    refresh.StopAutomaticRefreshDelay();
                    // speichern
                    $scope.OnGridSAPInterfaceSave();

                    // normale Aktualisierung
                    if ($scope.checkBoxAutomaticRefreshValue == 1) refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
                }
                    // Antwort: cancel and continue
                else if (data.value == 2) {
                    refresh.StopAutomaticRefreshDelay();
                    // speichern
                    $scope.OnGridSAPInterfaceRefresh();
                    // normale Aktualisierung
                    if ($scope.checkBoxAutomaticRefreshValue == 1) refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
                }
            } finally {
                // Dialog wurde ausgeblendet
                m_IsRefreshDelayDialogVisible = false;
            }

        });
    };



    var f_OnAutomaticRefreshDelayElapsedPage = function () {
        // Dialog ist ab jetzt sichtbar
        if (m_IsRefreshDelayDialogVisible) return;
        m_IsRefreshDelayDialogVisible = true;


        var dlg = ngDialog.open({
            template: 'modalDialogAutomaticRefreshDelayElapsedTemplatePage',
            scope: $scope
        });
        dlg.closePromise.then(function (data) {
            try {
                // nur wenn Automatische Aktualisierung aktiv ist    
                // Antwort: continue
                if (data.value == 0) {
                    if ($scope.checkBoxAutomaticRefreshValue == 1) refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
                }
                    // Antwort: cancel and continue
                else if (data.value == 2) {
                    refresh.StopAutomaticRefreshDelay();
                    // speichern
                    $scope.OnGridSAPInterfaceRefresh();
                    // normale Aktualisierung
                    if ($scope.checkBoxAutomaticRefreshValue == 1) refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
                }
            } finally {
                // Dialog wurde ausgeblendet
                m_IsRefreshDelayDialogVisible = false;
            }

        });
    };


    // Datenquelle für Unit/Material
    $scope.dataSourceKendoOdsUnits = kendoOdsUnits.getDataSource;
    $scope.dataSourceKendoOdsMaterials = kendoOdsMaterials.getDataSource;

    // ----------------------------------------
    // Init
    $scope.OnInitSAPInterfaceHeaders = function () {

        // Status Initialisieren                                          
        kendoOdsEnumerationTexts.init(ENUM_STATUS_HEADER);
        kendoOdsEnumerationTexts.init(ENUM_IS_COMPLETE);

        // Filter setzen
        kendoHelper.setDataSourceFilters(m_dataSourceSAPInterfaceHeaders, "BatchProcessStartTime", "gte", $scope.dtSAPInterfaceHeadersStartValue); // gte Kendo Operator
        kendoHelper.setDataSourceFilters(m_dataSourceSAPInterfaceHeaders, "BatchProcessStartTime", "lte", $scope.dtSAPInterfaceHeadersStopValue); // lte Kendo Operator
        //kendoHelper.setDataSourceFilters(m_dataSourceSAPInterfaceHeaders, "IsComplete", "eq", 0);

        // Sortierung setzen
        kendoHelper.setDataSourceSorts(m_dataSourceSAPInterfaceHeaders, "BatchProcessStartTime", "desc");

        // Werte initialisiert
        m_dataValuesInitialized = true;

        // Datenquelle zuweisen
        $scope.gridSAPInterfaceHeaders.dataSource = m_dataSourceSAPInterfaceHeaders;

        // Datenquelle lesen
        $scope.gridSAPInterfaceHeaders.dataSource.read();

        // Autorefresh starten
        $scope.OnCheckBoxAutomaticRefreshChange();
    };

    // ----------------------------------------
    // Checkbox für Automatische Aktualisierung
    $scope.checkBoxAutomaticRefreshValue = 1;

    // DateTimePicker für StartTime                                              
    $scope.dtSAPInterfaceHeadersStopValue = new Date(new Date(new Date().getTime() + 7 * TIMEINTERVAL_PER_DAY_MS));
    $scope.dtSAPInterfaceHeadersStartValue = new Date(new Date(new Date().getTime() - 7 * TIMEINTERVAL_PER_DAY_MS));



    // ----------------------------------------
    // Änderungen an Datums/Zeitauswahl - StartTime - Start
    $scope.dateTimePickerSAPInterfaceHeadersStart = {
        change: function () {
            $scope.OnGridSAPInterfaceRefresh();
        }
    };

    // Änderungen an Datums/Zeitauswahl - StartTime - Stop
    $scope.dateTimePickerSAPInterfaceHeadersStop = {
        change: function () {
            $scope.OnGridSAPInterfaceRefresh();
        }
    };

    // Optionen für Grid SAPInterfaceHeader
    $scope.gridSAPInterfaceHeaders = {
        // toolbar: ["pdf", "excel"],       // disabled due to bug in kendo ui 2015 
        pdf: {
            fileName: txt.TXT_SAP_INTERFACE + "-" + new Date() + ".pdf",
            title: txt.TXT_SAP_INTERFACE,
            creator: "Plant iT WebPortal",
            allPages: true,
            landscape: true,
            margin: {
                left: "10mm",
                right: "10mm",
                top: "10mm",
                bottom: "10mm"
            }
        },
        pdfExport: function (e) {
            m_pdfExportRunning = true;

            e.promise.done(function () {
                m_pdfExportRunning = false;

                // Daten des Grids neu laden
                $scope.OnGridSAPInterfaceRefresh();
            });

        },
        excel: {
            fileName: txt.TXT_SAP_INTERFACE + "-" + new Date() + ".xlsx",
            allPages: true
        },
        dataBound: function (e) {
            var actualSAPInterfaceHeadersPage = $scope.gridSAPInterfaceHeaders.pager.dataSource.page();

            // Seite wieder laden
            if (actualSAPInterfaceHeadersPage > 1 && $scope.checkBoxAutomaticRefreshValue == 1) {
                refresh.StopAutomaticRefresh();
                refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsedPage);
            }

            // Einfärben
            var gridData = this.dataSource.view();
            var headerCells = this.thead.find("th");

            for (var i = 0; i < gridData.length; i++) {

                for (var j = 0; j < headerCells.length; j++) {

                    // Wenn der Wert nicht bekannt ist, ignorieren
                    if (gridData[i].StatusPO === undefined || gridData[i].StatusPP === undefined || gridData[i].StatusQM === undefined) continue;

                    if (headerCells.eq(j).data("field") == "StatusPO") {
                        if (gridData[i].StatusPO === STATUS_SIH_ERROR) {
                            $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                        } else if (gridData[i].StatusPO === STATUS_SIH_OK) {
                            $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellStatusOK");
                        }
                    }

                    if (headerCells.eq(j).data("field") == "StatusPP") {
                        if (gridData[i].StatusPP === STATUS_SIH_ERROR) {
                            $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                        } else if (gridData[i].StatusPP === STATUS_SIH_OK) {
                            $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellStatusOK");
                        }
                    }
                    if (headerCells.eq(j).data("field") == "StatusQM") {
                        if (gridData[i].StatusQM === STATUS_SIH_ERROR) {
                            $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                        } else if (gridData[i].StatusQM === STATUS_SIH_OK) {
                            $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellStatusOK");
                        }
                    }
                }
            };

            // ToolTip
            $scope.gridSAPInterfaceHeaders.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                $(this).attr('title', $(this).data('title'));
            })

            // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
            // dadurch entsteht Speicherverschmiss
            if (m_timeoutSAPInterfaceHeaderHandle != null) {
                // ggf. laufenden Timeout stoppen
                clearTimeout(m_timeoutSAPInterfaceHeaderHandle);

                // zurücksetzen
                m_timeoutSAPInterfaceHeaderHandle = null;
            }

            if (m_timeoutSAPInterfaceHeaderHandle == null) {

                // Timeout starten
                m_timeoutSAPInterfaceHeaderHandle = setTimeout(function (grid) {

                    // Timeout abgelaufen
                    m_timeoutSAPInterfaceHeaderHandle = null;

                    // expandierten Zeilenzustand wiederherstellen
                    if (m_expandedRows) {
                        for (var i = 0; i < grid.tbody.children().length; i++) {
                            var row = $(grid.tbody.children()[i]);
                            var uid = row.data("uid");

                            if (!!grid.dataSource && !!uid) {
                                var dataItemByUid = grid.dataSource.getByUid(row.data("uid"));

                                if (!!dataItemByUid) {

                                    for (var j = 0; j < m_expandedRows.length; j++) {
                                        if (m_expandedRows[j] == dataItemByUid.id) {
                                            m_expandedRows[j] = 0;
                                            grid.expandRow(row);
                                        }
                                    }
                                }
                                row = undefined;
                            }
                        }
                    }

                    // selektierte Zeilen wiederherstellen
                    if (m_selectedRows) {
                        var selectedRow = undefined;
                        for (var i = 0; i < grid.tbody.children(".k-master-row").length; i++) {
                            var row = $(grid.tbody.children(".k-master-row")[i]);
                            var uid = row.data("uid");

                            if (!!grid.dataSource && !!uid) {
                                var dataItemByUid = grid.dataSource.getByUid(row.data("uid"));

                                if (!!dataItemByUid) {

                                    for (var j = 0; j < m_selectedRows.length; j++) {
                                        if (m_selectedRows[j] == dataItemByUid.id) {
                                            selectedRow = row;
                                            break;
                                        }
                                    }
                                    if (!!selectedRow) break;
                                }
                                row = undefined;
                            }
                        }

                        if (selectedRow && selectedRow.length > 0) {
                            grid.select(selectedRow[0]);
                        }
                    }
                }, TIMEOUT_DELAY_DATABOUND, this);


            }
        },
        scrollable: true,
        sortable: true,
        editable: true, // damit update von datasource moeglich ist
        resizable: true,
        selectable: true,
        autoBind: false,

        pageable: {
            pageSize: 10,
            pageSizes: true,
            buttonCount: 5
        },
        filterable: {
            extra: false,
            operators: {
                string: {
                    startswith: txt.TXT_STARTS_WITH,
                    eq: txt.TXT_IS_EQUAL_TO,
                    neq: txt.TXT_IS_NOT_EQUAL_TO
                }
            }
        },

        detailExpand: function (e) {
            // Zeile vom Elternzeile hervorheben
            e.masterRow.addClass('highlight');
        },
        detailCollapse: function (e) {
            // Hervorhebung von Elternzeile entfernen
            e.masterRow.removeClass('highlight');
        },

        edit: function (e) {

            // bearbeitbar?              
            var columnIndex = this.cellIndex(e.container);
            var fieldName = this.thead.find("th").eq(columnIndex + 1).data("field");

            if (EDITABLE_FIELDS_UPDATE_SIH.indexOf(fieldName) < 0) {
                this.closeCell();
            } else if (EDITABLE_FIELDS_UPDATE_SIH.indexOf(fieldName) <= 0 && fieldName == 'SAP_PO' && e.model.StatusPO == STATUS_SIH_OK) {
                this.closeCell();
            }


            // Automatische Aktualisierung anhalten und Verzögerung starten
            if ($scope.checkBoxAutomaticRefreshValue == 1 && EDITABLE_FIELDS_UPDATE_SIH.indexOf(fieldName) >= 0) {
                refresh.StopAutomaticRefresh();
                refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
            }
        },

        columns: [{
            field: "Excel",
            title: " ",
            width: "2.6%",
            filterable: false,
            attributes: {
                style: "text-align: center;"
            },
            template: function (dataItem) {
                return '<a id="excel" href="SAPInterface/DownloadBrewReport?_BatchKey=' + dataItem._BatchKey + '" class= "excelClass">'
            }
        }, {
            field: "Brewline",
            title: txt.TXT_BREWLINE,
            width: "3.6%",
        }, {
            field: "BatchName",
            title: txt.TXT_BATCH_NAME,
            width: "7.6%",
        }, {
            field: "SAP_Batch",
            title: txt.TXT_SAP_BATCH,
            width: "6.2%",
            attributes: {
                style: "text-align: center;"
            },
        }, {
            field: "IsLocked",
            title: txt.TXT_LOCKED,
            width: "2.6%",
            filterable: false,
            template: '<input type="checkbox" ng-model="dataItem.IsLocked" ng-change="OnCheckBoxIsLockedChange(dataItem)"></input>',
            attributes: {
                style: "text-align: center;"
            },
        }, {
            field: "Material",
            title: txt.TXT_MATERIAL,
            width: "9.6%",
            template: function (data) {
                if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
                    if (data.MaterialGlobalName != null) {
                        return data.MaterialGlobalName;
                    }
                    return '';
                } else {
                    if (data.MaterialLocalName != null) {
                        return data.MaterialLocalName;
                    }
                    return '';
                }
            }
        }, {
            field: "CurrentStep",
            title: txt.TXT_STATUS,
            width: "5.2%",
            attributes: {
                style: "text-align: center;"
            },
            template: function (data) {
                if (data.CurrentStep != null && data.CurrentStep != 'null') {
                    return data.CurrentStep;
                } else {
                    return ' ';
                }
            },
        }, {
            field: "BatchProcessStartTime",
            title: txt.TXT_BATCH_PROCESS_START_TIME,
            width: "9.2%",
            editor: kendoHelper.getEditorDateTime,
                template: "#= kendo.toString(kendo.parseDate(BatchProcessStartTime, 'yyyy-MM-dd'), 'dd/MM/yyyy HH:mm') #",
            attributes: {
                style: "text-align: center;"
            },
            filterable: false
        }, {
            field: "SAP_PO",
            title: txt.TXT_SAP_PO,
            width: "7.7%",
            attributes: {
                style: "text-align: center;"
            },
            template: function (dataItem) {
                if (dataItem.SAP_PO == null) {
                    return '';
                } else {
                    return dataItem.SAP_PO;
                }
            }
        }, {
            field: "StatusPO",
            attributes: {
                style: "text-align: center;"
            },
            title: txt.TXT_CREATE,
            width: "14.1%",
            template: function (dataItem) {
                if (dataItem.StatusPO == null) {
                    return '';
                }
                if (dataItem.IsLocked == 1) {
                    if (dataItem.ErrorPO == null) {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusPO, ENUM_STATUS_HEADER)) + '</div>'
                    } else {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusPO, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div style="text-align:center;">' + dataItem.ErrorPO + '</div>'
                    }
                } else if (dataItem.StatusPO == STATUS_SIH_WAITING && dataItem.IsLocked == 0) {
                    if (dataItem.ErrorPO == null) {
                        return '<button kendo-button class="validate" ng-click="OnChangeStateSAPInterfaceHeadersStatusPO($event)">' + txt.TXT_SEND_TO_SAP +
                            '</button>&nbsp;&nbsp;<button kendo-button class="manualOk" ng-click="DisablePO($event)">' + txt.TXT_MANUAL_OK + '</button>'
                    }
                    return '<button kendo-button class="validate" ng-click="OnChangeStateSAPInterfaceHeadersStatusPO($event)">' + txt.TXT_SEND_TO_SAP +
                        '</button>&nbsp;&nbsp;<button kendo-button class="manualOk" ng-click="DisablePO($event)">' + txt.TXT_MANUAL_OK + '</button>' +
                        '<div style="text-align:center;">' + dataItem.ErrorPO + '</div>'
                } else if (dataItem.StatusPO == STATUS_SIH_ERROR) {
                    if (dataItem.ErrorPO == null) {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusPO, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPO($event)"> </button></div>'
                    }
                    return '<div style="text-align:center;">' + dataItem.ErrorPO + '</div>' +
                        '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPO($event)"> </button></div>'
                } else if (dataItem.StatusPO == STATUS_SIH_MANUAL_OK) {
                    return '<div style="text-align:center;">' + txt.TXT_MANUAL_OK + '</div>' +
                        '<div style="text-align:center;">' + kendo.toString(new Date(dataItem.POSent), 'dd-MM-yyyy, HH:mm') + '</div>' +
                        '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPO($event)"> </button></div>'
                } else if (dataItem.StatusPO == STATUS_SIH_ERROR) {
                    if (dataItem.ErrorPO == null) {
                        '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPO($event)"> </button></div>'
                    }
                    '<div style="text-align:center;">' + dataItem.ErrorPO + '</div>' +
                        '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPO($event)"> </button></div>'
                } else {
                    if (dataItem.ErrorPO == null) {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusPO, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div id="smallReset" style = "margin-top:-11%"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPO($event)"> </button></div>'
                    }
                    return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusPO, ENUM_STATUS_HEADER)) + '</div>' +
                        '<div style="text-align:center;">' + dataItem.ErrorPO + '</div>' +
                        '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPO($event)"> </button></div>'
                }
            },
            filterable: false
        }, {
            field: "StatusPP",
            title: txt.TXT_PP,
            width: "14.1%",
            attributes: {
                style: "text-align: center;"
            },
            template: function (dataItem) {
                if (dataItem.StatusPP == null) {
                    return '';
                }
                if (dataItem.IsLocked == 1) {
                    if (dataItem.ErrorPP == null) {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusPP, ENUM_STATUS_HEADER)) + '</div>'
                    } else {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusPP, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div style="text-align:center;">' + dataItem.ErrorPP + '</div>'
                    }
                } else if (dataItem.StatusPP == STATUS_SIH_WAITING && dataItem.IsLocked == 0) {
                    if (dataItem.ErrorPP == null) {
                        return '<button kendo-button class="validate" ng-click="OnChangeStateSAPInterfaceHeadersStatusPP($event)">' + txt.TXT_SEND_TO_SAP +
                            '</button>&nbsp;&nbsp;<button kendo-button class="manualOk" ng-click="DisablePP($event)">' + txt.TXT_MANUAL_OK + '</button>'
                    }
                    return '<button kendo-button class="validate" ng-click="OnChangeStateSAPInterfaceHeadersStatusPP($event)">' + txt.TXT_SEND_TO_SAP +
                        '</button>&nbsp;&nbsp;<button kendo-button class="manualOk" ng-click="DisablePP($event)">' + txt.TXT_MANUAL_OK + '</button>' +
                        '<div style="text-align:center;">' + dataItem.ErrorPP + '</div>'
                } else if (dataItem.StatusPP == STATUS_SIH_ERROR) {
                    if (dataItem.ErrorPP == null) {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusPP, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPP($event)"> </button></div>'
                    }
                    return '<div style="text-align:center;">' + dataItem.ErrorPP + '</div>' +
                        '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPP($event)"> </button></div>'
                } else if (dataItem.StatusPP == STATUS_SIH_MANUAL_OK) {
                    return '<div style="text-align:center;">' + txt.TXT_MANUAL_OK + '</div>' +
                        '<div style="text-align:center;">' + kendo.toString(new Date(dataItem.PPSent), 'dd-MM-yyyy, HH:mm') + '</div>' +
                        '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPP($event)"> </button></div>'
                } else {
                    if (dataItem.ErrorPP == null) {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusPP, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPP($event)"> </button></div>'
                    } else {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusPP, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div style="text-align:center;">' + dataItem.ErrorPP + '</div>' +
                            '<div id="smallResetPP"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusPP($event)"> </button></div>'
                    }
                }
            },
            filterable: false
        }, {
            field: "StatusQM",
            title: txt.TXT_QM,
            width: "14.1%",
            attributes: {
                style: "text-align: center;"
            },
            template: function (dataItem) {
                if (dataItem.StatusQM == null) {
                    return '';
                }
                if (dataItem.IsLocked == 1) {
                    if (dataItem.ErrorQM == null) {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusQM, ENUM_STATUS_HEADER)) + '</div>'
                    } else {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusQM, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div style="text-align:center;">' + dataItem.ErrorQM + '</div>'
                    }
                } else if (dataItem.StatusQM == STATUS_SIH_WAITING && dataItem.IsLocked == 0) {
                    if (dataItem.ErrorQM == null) {
                        return '<button kendo-button class="validate" ng-click="OnChangeStateSAPInterfaceHeadersStatusQM($event)">' + txt.TXT_SEND_TO_SAP +
                            '</button>&nbsp;&nbsp;<button kendo-button class="manualOk" ng-click="DisableQM($event)">' + txt.TXT_MANUAL_OK + '</button>'
                    }
                    return '<button kendo-button class="validate" ng-click="OnChangeStateSAPInterfaceHeadersStatusQM($event)">' + txt.TXT_SEND_TO_SAP +
                        '</button>&nbsp;&nbsp;<button kendo-button class="manualOk" ng-click="DisableQM($event)">' + txt.TXT_MANUAL_OK + '</button>' +
                        '<div style="text-align:center;">' + dataItem.ErrorQM + '</div>'
                } else if (dataItem.StatusQM == STATUS_SIH_ERROR) {
                    if (dataItem.ErrorQM == null) {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusQM, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusQM($event)"> </button></div>'
                    }
                    return '<div style="text-align:center;">' + dataItem.ErrorQM + '</div>' +
                        '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusQM($event)"> </button></div>'
                } else if (dataItem.StatusQM == STATUS_SIH_MANUAL_OK) {
                    return '<div style="text-align:center;">' + txt.TXT_MANUAL_OK + '</div>' +
                        '<div style="text-align:center;">' + kendo.toString(new Date(dataItem.QMSent), 'dd-MM-yyyy, HH:mm') + '</div>' +
                        '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusQM($event)"> </button></div>'
                } else {
                    if (dataItem.ErrorQM == null) {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusQM, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div id="smallReset"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusQM($event)"> </button></div>'
                    } else {
                        return '<div style="text-align:center;">' + kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.StatusQM, ENUM_STATUS_HEADER)) + '</div>' +
                            '<div style="text-align:center;">' + dataItem.ErrorQM + '</div>' +
                            '<div id="smallResetPP"><button kendo-button class="reset" style="width: 23px; padding-left: 19px;" ng-click="OnChangeStateSAPInterfaceHeadersStatusQM($event)"> </button></div>'
                    }

                }

            },
            filterable: false
        }, {
            field: "Comment",
            title: txt.TXT_COMMENT,
            width: "3.4%",
            attributes: {
                style: "text-align: center;"
            },
            template: '<input type="checkbox" #= Comment ? "checked" : "" # disabled="false" ></input>',
            filterable: false
        }, {
            field: "IsComplete",
            title: txt.TXT_IS_COMPLETE,
            width: "3.4%",
            attributes: {
                style: "text-align: center;"
            },
            template: '<input type="checkbox" #= IsComplete ? "checked" : "" # disabled="false" ></input>',
            filterable: {
                multi: true,
                dataSource: kendoOdsEnumerationTexts.getDataSource(ENUM_IS_COMPLETE),
                itemTemplate: function (e) {
                    if (e.field == "all") {
                        //handle the check-all checkbox template
                        return "<div><label><strong><input type='checkbox' />#= all#</strong></label></div><br />";
                    } else {
                        //handle the other checkboxes
                        return "<span><label><input type='checkbox' name='" + e.field + "' value='#=TextNumber#'/><span>#= angular.element(\'\\#SAPInterfaceCtrl\').scope().srv_kendoOdsEnumerationTexts.getText(data.TextNumber, \'" + ENUM_IS_COMPLETE + "\')  #</span></label></span><br />"
                    }
                }
            }
        }, {
            field: "POSent",
            template: function (dataItem) {
                if (dataItem.POSent != null) {
                    return dataItem.POSent;
                }
                return '';
            },
            hidden: true
        }, {
            field: "PPSent",
            template: function (dataItem) {
                if (dataItem.PPSent != null) {
                    return dataItem.PPSent;
                }
                return '';
            },
            hidden: true
        }, {
            field: "QMSent",
            template: function (dataItem) {
                if (dataItem.QMSent != null) {
                    return dataItem.QMSent;
                }
                return '';
            },
            hidden: true
        }]
    };

    // Optionen für Grid SAPInterfaceValues        
    $scope.gridSAPInterfaceValues = function (dataItem) {
        return {
            dataSource: f_GetDataSourceSAPInterfaceValues(dataItem),
            dataBound: function (e) {

                this.pager.element.hide();
                collapseAllGroups(this);


                // Einfärben
                var headerCells = this.thead.find("th");
                var gridData = this.dataSource.data();

                for (var i = 0; i < gridData.length; i++) {

                    if (!!gridData[i]._EnumerationLink)
                        kendoOdsEnumerationTexts.init(gridData[i]._EnumerationLink);

                    // Wenn der Wert nicht bekannt ist, ignorieren
                    if (gridData[i].Value === undefined) continue;

                    if (gridData[i].Value == 0) gridData[i].Value = undefined

                    var bLimitViolation = false
                    var bLimitVetoViolation = false

                    for (var j = 0; j < headerCells.length; j++) {

                        // Untergrenze
                        if (headerCells.eq(j).data("field") == "LowerLimit") {
                            if (gridData[i].LowerLimit === undefined) continue;

                            if (gridData[i].Value < gridData[i].LowerLimit) {
                                bLimitViolation = true;
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                            } else {
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                            }
                        }

                        // Obergrenze
                        if (headerCells.eq(j).data("field") == "UpperLimit") {
                            if (gridData[i].UpperLimit === undefined) continue;

                            if (gridData[i].Value > gridData[i].UpperLimit) {
                                bLimitViolation = true;
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                            } else {
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                            }
                        }


                        // Untergrenze (Plus)
                        if (headerCells.eq(j).data("field") == "LowerVetoLimit") {
                            if (gridData[i].LowerVetoLimit === undefined) continue;

                            if (gridData[i].Value < gridData[i].LowerVetoLimit) {
                                bLimitVetoViolation = true;
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                            } else {
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                            }
                        }


                        // Obergrenze (Plus)
                        if (headerCells.eq(j).data("field") == "UpperVetoLimit") {
                            if (gridData[i].UpperVetoLimit === undefined) continue;

                            if (gridData[i].Value > gridData[i].UpperVetoLimit) {
                                bLimitVetoViolation = true;
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                            } else {
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                            }
                        }

                        //Innerhalb der Grenzen
                        if (gridData[i].Value > gridData[i].LowerLimit && gridData[i].Value < gridData[i].UpperLimit) {
                            bLimitVetoViolation = false;
                            bLimitViolation = false;
                            $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellInsideBorder");
                        }
                    }



                    if (bLimitViolation || bLimitVetoViolation) {
                        for (var j = 0; j < headerCells.length; j++) {
                            // Untergrenze
                            if (headerCells.eq(j).data("field") == "Value") {
                                if (bLimitVetoViolation) {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                                    break;
                                } else if (bLimitViolation) {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                                    break;
                                }
                            }
                        }
                    }
                }

                // ToolTip
                $scope.gridSAPInterfaceHeaders.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                    $(this).attr('title', $(this).data('title'));
                })

                // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                // dadurch entsteht Speicherverschmiss
                if (m_timeoutSAPInterfaceValueHandle[dataItem.id] != null) {
                    // ggf. laufenden Timeout stoppen
                    clearTimeout(m_timeoutSAPInterfaceValueHandle[dataItem.id]);

                    // zurücksetzen
                    m_timeoutSAPInterfaceValueHandle[dataItem.id] = null;
                }

                if (m_timeoutSAPInterfaceValueHandle[dataItem.id] == null) {

                    // Timeout starten
                    m_timeoutSAPInterfaceValueHandle[dataItem.id] = setTimeout(function (grid) {

                        // Timeout abgelaufen
                        m_timeoutSAPInterfaceValueHandle[dataItem.id] = null;

                        // expandierten Zeilenzustand wiederherstellen
                        if (m_expandedRows) {
                            for (var i = 0; i < grid.tbody.children().length; i++) {
                                var row = $(grid.tbody.children()[i]);
                                var uid = row.data("uid");

                                if (!!grid.dataSource && !!uid) {
                                    var dataItemByUid = grid.dataSource.getByUid(row.data("uid"));

                                    if (!!dataItemByUid) {

                                        for (var j = 0; j < m_expandedRows.length; j++) {
                                            if (m_expandedRows[j] == dataItemByUid.id) {
                                                m_expandedRows[j] = 0;
                                                grid.expandRow(row);
                                            }
                                        }
                                    }
                                    row = undefined;
                                }
                            }
                        }

                        // selektierte Zeilen wiederherstellen
                        if (m_selectedRows) {
                            var selectedRow = undefined;
                            for (var i = 0; i < grid.tbody.children(".k-master-row").length; i++) {
                                var row = $(grid.tbody.children(".k-master-row")[i]);
                                var uid = row.data("uid");

                                if (!!grid.dataSource && !!uid) {
                                    var dataItemByUid = grid.dataSource.getByUid(row.data("uid"));

                                    if (!!dataItemByUid) {

                                        for (var j = 0; j < m_selectedRows.length; j++) {
                                            if (m_selectedRows[j] == dataItemByUid.id) {
                                                selectedRow = row;
                                                break;
                                            }
                                        }

                                        if (!!selectedRow) break;
                                    }

                                    row = undefined;
                                }
                            }

                            if (selectedRow && selectedRow.length > 0) {
                                grid.select(selectedRow[0]);
                            }
                        }
                    }, TIMEOUT_DELAY_DATABOUND, this);


                }

                // ToolTip
                this.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                    $(this).attr('title', $(this).data('title'));
                })
            },
            scrollable: false,
            sortable: true,
            editable: true, // damit update von datasource moeglich ist
            resizable: true,
            selectable: true,

            pageable: {
                pageSizes: true,
                buttonCount: 5
            },
            filterable: {
                extra: false,
                operators: {
                    string: {
                        startswith: txt.TXT_STARTS_WITH,
                        eq: txt.TXT_IS_EQUAL_TO,
                        neq: txt.TXT_IS_NOT_EQUAL_TO
                    }
                }
            },

            detailExpand: function (e) {
                // Zeile vom Elternzeile hervorheben
                e.masterRow.addClass('highlight');
            },
            detailCollapse: function (e) {
                // Hervorhebung von Elternzeile entfernen
                e.masterRow.removeClass('highlight');
            },

            edit: function (e) {
                // Automatische Aktualisierung anhalten und Verzögerung starten
                if ($scope.checkBoxAutomaticRefreshValue == 1) {
                    refresh.StopAutomaticRefresh();
                    refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
                }

                var columnIndex = this.cellIndex(e.container);
                var fieldName = this.thead.find("th").eq(columnIndex + 2).data("field");

                // Detailzeile des Headers ermitteln
                var detailHeaderRow = e.sender.tbody.closest("tr.k-detail-row");

                // passende Kopfzeile ermitteln
                var dataHeaderItem = $scope.gridSAPInterfaceHeaders.dataItem(detailHeaderRow.prev());

                // bearbeitbar? 
                if (EDITABLE_FIELDS_UPDATE_SIV.indexOf(fieldName) < 0 || (dataHeaderItem.StatusPO == 1 || dataHeaderItem.StatusPO == 5) || (dataHeaderItem.StatusPP == 1 || dataHeaderItem.StatusPP == 5) || (dataHeaderItem.StatusQM == 1 || dataHeaderItem.StatusQM == 5)) this.closeCell();
                else {
                    var gridData = this.dataSource.data();
                    for (var i = 0; i < gridData.length; i++) {
                        $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass("gridCellOutOfSpec") + $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass("gridCellOutOfSpecVeto");
                    }

                    // Einfärben
                    var headerCells = this.thead.find("th");
                    var gridData = this.dataSource.data();

                    for (var i = 0; i < gridData.length; i++) {

                        // Wenn der Wert nicht bekannt ist, ignorieren
                        if (gridData[i].Value === undefined) continue;

                        if (gridData[i].Value == 0) gridData[i].Value = undefined

                        var bLimitViolation = false
                        var bLimitVetoViolation = false

                        for (var j = 0; j < headerCells.length; j++) {

                            // Untergrenze
                            if (headerCells.eq(j).data("field") == "LowerLimit") {
                                if (gridData[i].LowerLimit === undefined) continue;

                                if (gridData[i].Value < gridData[i].LowerLimit) {
                                    bLimitViolation = true;
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                                } else {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                                }
                            }

                            // Obergrenze
                            if (headerCells.eq(j).data("field") == "UpperLimit") {
                                if (gridData[i].UpperLimit === undefined) continue;

                                if (gridData[i].Value > gridData[i].UpperLimit) {
                                    bLimitViolation = true;
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                                } else {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                                }
                            }

                            // Untergrenze (Plus)
                            if (headerCells.eq(j).data("field") == "LowerVetoLimit") {
                                if (gridData[i].LowerVetoLimit === undefined) continue;

                                if (gridData[i].Value < gridData[i].LowerVetoLimit) {
                                    bLimitVetoViolation = true;
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                                } else {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                                }
                            }

                            // Obergrenze (Plus)
                            if (headerCells.eq(j).data("field") == "UpperVetoLimit") {
                                if (gridData[i].UpperVetoLimit === undefined) continue;

                                if (gridData[i].Value > gridData[i].UpperVetoLimit) {
                                    bLimitVetoViolation = true;
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                                } else {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                                }
                            }

                            //Innerhalb der Grenzen
                            if (gridData[i].Value > gridData[i].LowerLimit && gridData[i].Value < gridData[i].UpperLimit) {
                                bLimitVetoViolation = false;
                                bLimitViolation = false;
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellInsideBorder");
                            }
                        }


                        if (bLimitViolation || bLimitVetoViolation) {
                            for (var j = 0; j < headerCells.length; j++) {
                                // Untergrenze
                                if (headerCells.eq(j).data("field") == "Value") {
                                    if (bLimitVetoViolation) {
                                        $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                                        break;
                                    } else if (bLimitViolation) {
                                        $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                                        break;
                                    }
                                }
                            }
                        }
                    }

                }
            },

            save: function (e) {
                if (e.values != undefined) {
                    // soll etwas gespeichert werden?
                    e.model._Kendo_SaveIt = 1;
                }
            },

            columns: [{
                field: "ValueName",
                title: txt.TXT_VALUE_NAME,
                width: "30%",
                template: function (data) {
                    if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                        if (data.ValueCategoryGlobalName == null) {
                            return '';
                        }
                        return data.ValueCategoryGlobalName;
                    }
                    if (data.ValueCategoryLocalName == null) {
                        return '';
                    }
                    return data.ValueCategoryLocalName;
                },
            }, {
                field: "Value",
                title: txt.TXT_VALUE,
                width: "9%",
                attributes: {
                    style: "text-align: right;"
                },
                template: function (data) {
                    if (data._EnumerationLink != null && data._EnumerationLink != '') {
                        if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                            if (data.dirty) {
                                return data.ValueCombo.EnumerationTextGlobalName
                            }
                            else {
                                return data.EnumerationTextGlobalName;
                            }
                        }
                        else {
                            if (data.dirty) {
                                return data.ValueCombo.EnumerationTextLocalName
                            }
                            else {
                                return data.EnumerationTextLocalName;
                            }
                        }
                    }
                    else if (data.ValueString != null) {
                        return data.ValueString;

                    }
                    else if (data.Value || data.Value == 0) {
                        if (data.Value != null) {
                        return kendo.toString(data.Value, ((!data.Format) ? 2 : data.Format));
                        }
                        else {
                            return null;
                        }
                    }
                    else {
                        return '';
                    }
                },
                editor: function (container, options) {
                    if (options.model._EnumerationLink != null && options.model._EnumerationLink != '') {
                        options.field = 'ValueCombo';
                        if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                            $('<input kendo-drop-down-list  k-data-text-field="\'EnumerationTextGlobalName\'" k-data-value-field="\'TextNumber\'" data-bind="value:' + options.field + '" k-data-source="dataSourceEnumerationTexts(\'' + options.model._EnumerationLink + '\')" />').appendTo(container);
                        } else {
                            $('<input kendo-drop-down-list  k-data-text-field="\'EnumerationTextLocalName\'" k-data-value-field="\'TextNumber\'" data-bind="value:' + options.field + '" k-data-source="dataSourceEnumerationTexts(\'' + options.model._EnumerationLink + '\')" />').appendTo(container);
                        }
                    } else if (options.model.Value) {
                        var input = $('<input data-text-field="Value" data-value-field="Value" data-bind="value:Value"/>')
                        input.appendTo(container);
                        input.kendoNumericTextBox();
                    } else {
                        var input = $('<input type="text" class="k-input k-textbox" name="ValueString" data-bind:"value:ValueString">');
                        input.appendTo(container);
                    }
                },
            }, {
                field: "UnitOfMeasurement",
                title: txt.TXT_UNIT_OF_MEASUREMENT,
                width: "9%",
                filterable: false,
                template: function (data) {
                    if (data.UnitOfMeasurement == null) {
                        return '';
                    } else if (data.UnitOfMeasurement === '[sec]' && data.TargetUoM === '[min]') {
                        return data.TargetUoM;
                    } else if (data.UnitOfMeasurement === '[sec]' && data.TargetUoM === '[h]') {
                        return data.TargetUoM;
                    } else if (data.UnitOfMeasurement === '[min]' && data.TargetUoM === '[h]') {
                        return data.TargetUoM;
                    } else if (data.UnitOfMeasurement === '' && data.TargetUoM != '') {
                        return data.TargetUoM;
                    } else {
                        return data.UnitOfMeasurement;
                    }
                },
            }, {
                field: "RecordingTime",
                title: txt.TXT_RECORDING_TIME,
                width: "14%",
                    template: "#= kendo.toString(kendo.parseDate(RecordingTime, 'yyyy-MM-dd'), 'dd/MM/yyyy HH:mm') #",
                attributes: {
                    style: "text-align: center;"
                },
            }, {
                field: "ValueOriginal",
                title: txt.TXT_VALUE_ORIGINAL,
                width: "9%",
                template: function (data) {
                    if (data._EnumerationLink != null && data._EnumerationLink != '') {
                        if (PCommonPortalMethods.GetSiteLanguage() == "en") { 
                                return data.EnumerationTextGlobalName;
                        }
                        else {
                                return data.EnumerationTextLocalName;
                            }
                    }
                    else if (data.ValueOriginal) {
                        return kendo.toString(data.ValueOriginal, ((!data.Format) ? 2 : data.Format));
                    } else {
                        return '';
                    }
                },
                attributes: {
                    style: "text-align: right;"
                },
            }, {
                field: "LowerLimit",
                title: txt.TXT_LOWER_LIMIT,
                width: "9%",
                attributes: {
                    style: "text-align:right;"
                },
                template: function (data) {
                    if (data.LowerLimit) {
                        return kendo.toString(data.LowerLimit, ((!data.Format) ? 2 : data.Format));
                    } else {
                        return '';
                    }
                }
            }, {
                field: "UpperLimit",
                title: txt.TXT_UPPER_LIMIT,
                width: "9%",
                attributes: {
                    style: "text-align:right;"
                },
                template: function (data) {
                    if (data.UpperLimit) {
                        return kendo.toString(data.UpperLimit, +((!data.Format) ? 2 : data.Format));
                    } else {
                        return '';
                    }
                }
            }, {
                field: "LowerVetoLimit",
                title: txt.TXT_LOWER_LIMIT_PLUS,
                width: "9%",
                attributes: {
                    style: "text-align:right;"
                },
                template: function (data) {
                    if (data.LowerVetoLimit) {
                        return kendo.toString(data.LowerVetoLimit, ((!data.Format) ? 2 : data.Format));
                    } else {
                        return '';
                    }
                }
            }, {
                field: "UpperVetoLimit",
                title: txt.TXT_UPPER_LIMIT_PLUS,
                width: "9%",
                attributes: {
                    style: "text-align:right;"
                },
                template: function (data) {
                    if (data.UpperVetoLimit) {
                        return kendo.toString(data.UpperVetoLimit, ((!data.Format) ? 2 : data.Format));
                    } else {
                        return '';
                    }
                }
            }, {
                field: "Comment",
                title: txt.TXT_COMMENT,
                width: "8%",
                attributes: {
                    style: "text-align: center;"
                },
                template: '<input type="checkbox" #= Comment ? "checked" : "" # disabled="false" ></input>',
                filterable: false
            }, {
                field: "UnitGlobalName",
                groupHeaderTemplate: function (dataItem) {
                    if (dataItem.value != null) {
                        return dataItem.value;
                    }
                    return 'Undefined';
                },
                hidden: true
            }, {
                field: "UnitLocalName",
                groupHeaderTemplate: function (dataItem) {
                    if (dataItem.value != null) {
                        return dataItem.value;
                    }
                    return 'Undefined';
                },
                hidden: true
            }]
        };
    };


    // Optionen für Grid SAPInterfaceManualInput        
    $scope.gridSAPInterfaceManualInput = function (dataItem) {
        return {
            dataSource: f_GetDataSourceSAPInterfaceManualInput(dataItem),
            dataBound: function (e) {

                this.pager.element.hide();
                collapseAllGroups(this);


                //// Wenn enter keydown event passiert, auf die nächste Zeile springen
                //$(e.sender.tbody.closest('[kendo-grid]')).keydown(function (event) {
                //    if (event.which == 13) {
                //        event.preventDefault();
                //        var curRow = $(this).find(".k-state-selected")
                //        //           var index = $(curRow).find('tr').next().index() + 1;
                //        var index = curRow.next().find('td:eq(2)').next().find('td:eq(2)').index() + 1;
                //        for (var i = index; i < $('tr', this).length; i++) {
                //            var data = $(this).data('kendoGrid').dataItem($('tr', this).eq(i));

                //            if (data != undefined) {
                //                $(this).data('kendoGrid').editCell($('tr', this).eq(i).find('td:eq(2)'));
                //       //         $(this).data('kendoGrid').editCell($('tr', this).eq(index + 1).next().find('td:eq(2)'))
                //                //                   $(this).data('kendoGrid')._editContainer.find('td:eq(2)');
                //                return;
                //            }
                //        }
                //    }
                //});        




                //$(e.sender.tbody.closest('[kendo-grid]')).on("keydown", function (event) {
                //    if (event.keyCode == 13) {


                //            var curCell = $(e.sender.tbody.closest('[kendo-grid]')).find(".k-state-selected")
                //            var eCell = $(e.sender.tbody.closest('[kendo-grid]')).find(".k-edit-cell")

                //            curCell.removeClass("k-state-selected");
                //            curCell.removeClass("k-state-focused");
                //            curCell.removeAttr("data-role");
                //            curCell.next().addClass("k-state-selected");
                //            curCell.next().addClass("k-state-focused");
                //            try {
                //                $(e.sender.tbody.closest('[kendo-grid]')).data('kendoGrid').closeCell(eCell);
                //            } catch (ex) {
                //            }
                //            $(e.sender.tbody.closest('[kendo-grid]')).data('kendoGrid').select();
                //            $(this).data('kendoGrid').editCell(curCell.next());

                //  //               $(curCell).next().find('td:eq(2)').focus()
                // //           $(curCell).next().find('td:eq(2)').addClass("k-state-focused");
                //        }
                //});




                // Einfärben
                var headerCells = this.thead.find("th");
                var gridData = this.dataSource.data();

                for (var i = 0; i < gridData.length; i++) {

                    // Wenn der Wert nicht bekannt ist, ignorieren
                    if (gridData[i].Value === undefined) continue;

                    if (gridData[i].Value == 0) gridData[i].Value = undefined

                    var bLimitViolation = false
                    var bLimitVetoViolation = false

                    for (var j = 0; j < headerCells.length; j++) {

                        // Untergrenze
                        if (headerCells.eq(j).data("field") == "LowerLimit") {
                            if (gridData[i].LowerLimit === undefined) continue;

                            if (gridData[i].Value < gridData[i].LowerLimit) {
                                bLimitViolation = true;
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                            } else {
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                            }
                        }

                        // Obergrenze
                        if (headerCells.eq(j).data("field") == "UpperLimit") {
                            if (gridData[i].UpperLimit === undefined) continue;

                            if (gridData[i].Value > gridData[i].UpperLimit) {
                                bLimitViolation = true;
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                            } else {
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                            }
                        }


                        // Untergrenze (Plus)
                        if (headerCells.eq(j).data("field") == "LowerVetoLimit") {
                            if (gridData[i].LowerVetoLimit === undefined) continue;

                            if (gridData[i].Value < gridData[i].LowerVetoLimit) {
                                bLimitVetoViolation = true;
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                            } else {
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                            }
                        }


                        // Obergrenze (Plus)
                        if (headerCells.eq(j).data("field") == "UpperVetoLimit") {
                            if (gridData[i].UpperVetoLimit === undefined) continue;

                            if (gridData[i].Value > gridData[i].UpperVetoLimit) {
                                bLimitVetoViolation = true;
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                            } else {
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                            }
                        }

                        //Innerhalb der Grenzen
                        if (gridData[i].Value > gridData[i].LowerLimit && gridData[i].Value < gridData[i].UpperLimit) {
                            bLimitVetoViolation = false;
                            bLimitViolation = false;
                            $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellInsideBorder");
                        }
                    }

                    if (bLimitViolation || bLimitVetoViolation) {
                        for (var j = 0; j < headerCells.length; j++) {
                            // Untergrenze
                            if (headerCells.eq(j).data("field") == "Value") {
                                if (bLimitVetoViolation) {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                                    break;
                                } else if (bLimitViolation) {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                                    break;
                                }
                            }
                        }
                    }
                }


                // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                // dadurch entsteht Speicherverschmiss
                if (m_timeoutSAPInterfaceManualInputHandle[dataItem.id] != null) {
                    // ggf. laufenden Timeout stoppen
                    clearTimeout(m_timeoutSAPInterfaceManualInputHandle[dataItem.id]);

                    // zurücksetzen
                    m_timeoutSAPInterfaceManualInputHandle[dataItem.id] = null;
                }
                if (m_timeoutSAPInterfaceManualInputHandle[dataItem.id] == null) {

                    // Timeout starten
                    m_timeoutSAPInterfaceManualInputHandle[dataItem.id] = setTimeout(function (grid) {

                        // Timeout abgelaufen
                        m_timeoutSAPInterfaceManualInputHandle[dataItem.id] = null;

                        // expandierten Zeilenzustand wiederherstellen
                        if (m_expandedRows) {
                            for (var i = 0; i < grid.tbody.children().length; i++) {
                                var row = $(grid.tbody.children()[i]);
                                var uid = row.data("uid");

                                if (!!grid.dataSource && !!uid) {
                                    var dataItemByUid = grid.dataSource.getByUid(row.data("uid"));
                                    if (!!dataItemByUid) {
                                        for (var j = 0; j < m_expandedRows.length; j++) {
                                            if (m_expandedRows[j] == dataItemByUid.id) {
                                                m_expandedRows[j] = 0;
                                                grid.expandRow(row);
                                            }
                                        }
                                    }
                                    row = undefined;
                                }
                            }
                        }

                        // selektierte Zeilen wiederherstellen
                        if (m_selectedRows) {
                            var selectedRow = undefined;
                            for (var i = 0; i < grid.tbody.children(".k-master-row").length; i++) {
                                var row = $(grid.tbody.children(".k-master-row")[i]);
                                var uid = row.data("uid");

                                if (!!grid.dataSource && !!uid) {
                                    var dataItemByUid = grid.dataSource.getByUid(row.data("uid"));
                                    if (!!dataItemByUid) {
                                        for (var j = 0; j < m_selectedRows.length; j++) {
                                            if (m_selectedRows[j] == dataItemByUid.id) {
                                                selectedRow = row;
                                                break;
                                            }
                                        }

                                        if (!!selectedRow) break;
                                    }
                                    row = undefined;
                                }
                            }

                            if (selectedRow && selectedRow.length > 0) {
                                grid.select(selectedRow[0]);
                            }
                        }
                    }, TIMEOUT_DELAY_DATABOUND, this);
                }



                // ToolTip
                this.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                    $(this).attr('title', $(this).data('title'));
                })
            },
            //dataBinding: function (e) {
            //    $("td").off();
            //    $(e.sender.tbody.closest('[kendo-grid]')).off('keydown');

            //},


            scrollable: false,
            sortable: true,
            editable: true, // damit update von datasource moeglich ist
            resizable: true,
            selectable: true,

            pageable: {
                pageSizes: true,
                buttonCount: 5
            },
            filterable: {
                extra: false,
                operators: {
                    string: {
                        startswith: txt.TXT_STARTS_WITH,
                        eq: txt.TXT_IS_EQUAL_TO,
                        neq: txt.TXT_IS_NOT_EQUAL_TO
                    }
                }
            },

            detailExpand: function (e) {
                // Zeile vom Elternzeile hervorheben
                e.masterRow.addClass('highlight');
            },
            detailCollapse: function (e) {
                // Hervorhebung von Elternzeile entfernen
                e.masterRow.removeClass('highlight');
            },

            edit: function (e) {
                // Automatische Aktualisierung anhalten und Verzögerung starten
                if ($scope.checkBoxAutomaticRefreshValue == 1) {
                    refresh.StopAutomaticRefresh();
                    refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
                }

                var columnIndex = this.cellIndex(e.container);
                var fieldName = this.thead.find("th").eq(columnIndex + 1).data("field");

                // Detailzeile des Headers ermitteln
                var detailHeaderRow = e.sender.tbody.closest("tr.k-detail-row");

                // passende Kopfzeile ermitteln
                var dataHeaderItem = $scope.gridSAPInterfaceHeaders.dataItem(detailHeaderRow.prev());

                // bearbeitbar? 
                if (EDITABLE_FIELDS_UPDATE_SIV.indexOf(fieldName) < 0 || (dataHeaderItem.StatusPO == 1 || dataHeaderItem.StatusPO == 5) || (dataHeaderItem.StatusPP == 1 || dataHeaderItem.StatusPP == 5) || (dataHeaderItem.StatusQM == 1 || dataHeaderItem.StatusQM == 5)) this.closeCell();
                else {
                    var gridData = this.dataSource.data();
                    for (var i = 0; i < gridData.length; i++) {
                        $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[2]).removeClass("gridCellOutOfSpec") + $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[2]).removeClass("gridCellOutOfSpecVeto");
                    }


                    // Einfärben
                    var headerCells = this.thead.find("th");
                    var gridData = this.dataSource.data();

                    for (var i = 0; i < gridData.length; i++) {

                        // Wenn der Wert nicht bekannt ist, ignorieren
                        if (gridData[i].Value === undefined) continue;

                        if (gridData[i].Value == 0) gridData[i].Value = undefined

                        var bLimitViolation = false
                        var bLimitVetoViolation = false

                        for (var j = 0; j < headerCells.length; j++) {

                            // Untergrenze
                            if (headerCells.eq(j).data("field") == "LowerLimit") {
                                if (gridData[i].LowerLimit === undefined) continue;

                                if (gridData[i].Value < gridData[i].LowerLimit) {
                                    bLimitViolation = true;
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                                } else {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                                }
                            }

                            // Obergrenze
                            if (headerCells.eq(j).data("field") == "UpperLimit") {
                                if (gridData[i].UpperLimit === undefined) continue;

                                if (gridData[i].Value > gridData[i].UpperLimit) {
                                    bLimitViolation = true;
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                                } else {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                                }
                            }


                            // Untergrenze (Plus)
                            if (headerCells.eq(j).data("field") == "LowerVetoLimit") {
                                if (gridData[i].LowerVetoLimit === undefined) continue;

                                if (gridData[i].Value < gridData[i].LowerVetoLimit) {
                                    bLimitVetoViolation = true;
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                                } else {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                                }
                            }

                            // Obergrenze (Plus)
                            if (headerCells.eq(j).data("field") == "UpperVetoLimit") {
                                if (gridData[i].UpperVetoLimit === undefined) continue;

                                if (gridData[i].Value > gridData[i].UpperVetoLimit) {
                                    bLimitVetoViolation = true;
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                                } else {
                                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).removeClass();
                                }
                            }

                            //Innerhalb der Grenzen
                            if (gridData[i].Value > gridData[i].LowerLimit && gridData[i].Value < gridData[i].UpperLimit) {
                                bLimitVetoViolation = false;
                                bLimitViolation = false;
                                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellInsideBorder");
                            }
                        }


                        if (bLimitViolation || bLimitVetoViolation) {
                            for (var j = 0; j < headerCells.length; j++) {
                                // Untergrenze
                                if (headerCells.eq(j).data("field") == "Value") {
                                    if (bLimitVetoViolation) {
                                        $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                                        break;
                                    } else if (bLimitViolation) {
                                        $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                                        break;
                                    }
                                }
                            }
                        }
                    }

                }
            },


            save: function (e) {
                if (e.values != undefined) {
                    // soll etwas gespeichert werden?
                    e.model._Kendo_SaveIt = 1;
                }
            },

            columns: [{
                field: "ValueName",
                title: txt.TXT_VALUE_NAME,
                width: "30%",
                template: function (data) {
                    if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                        if (data.ValueCategoryGlobalName == null) {
                            return '';
                        }
                        return data.ValueCategoryGlobalName;
                    }
                    if (data.ValueCategoryLocalName == null) {
                        return '';
                    }
                    return data.ValueCategoryLocalName;
                },
            }, {
                field: "Value",
                title: txt.TXT_VALUE,
                width: "9%",
                attributes: {
                    style: "text-align: right;"
                },
                template: function (data) {
                    if (data._EnumerationLink != null && data._EnumerationLink != '') {
                        if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                            if (data.dirty) {
                                return data.ValueCombo.EnumerationTextGlobalName
                            }
                            else {
                                return data.EnumerationTextGlobalName;
                            }
                        }
                        else {
                            if (data.dirty) {
                                return data.ValueCombo.EnumerationTextLocalName
                            }
                            else {
                                return data.EnumerationTextLocalName;
                            }
                        }
                    }
                    else if (data.ValueString != null) {
                        return data.ValueString;

                    }
                    else if (data.Value || data.Value == 0) {
                        if (data.Value != null) {
                        return kendo.toString(data.Value, ((!data.Format) ? 2 : data.Format));
                        }
                        else {
                            return null;
                        }
                    }
                    else {
                        return '';
                    }
                },
                editor: function (container, options) {
                    if (options.model._EnumerationLink != null && options.model._EnumerationLink != '') {
                        options.field = 'ValueCombo';
                        if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                            $('<input kendo-drop-down-list  k-data-text-field="\'EnumerationTextGlobalName\'" k-data-value-field="\'TextNumber\'" data-bind="value:' + options.field + '" k-data-source="dataSourceEnumerationTexts(\'' + options.model._EnumerationLink + '\')" />').appendTo(container);
                        } else {
                            $('<input kendo-drop-down-list  k-data-text-field="\'EnumerationTextLocalName\'" k-data-value-field="\'TextNumber\'" data-bind="value:' + options.field + '" k-data-source="dataSourceEnumerationTexts(\'' + options.model._EnumerationLink + '\')" />').appendTo(container);
                        }
                    } else if (options.model.Value) {
                        var input = $('<input data-text-field="Value" data-value-field="Value" data-bind="value:Value"/>')
                        input.appendTo(container);
                        input.kendoNumericTextBox();
                    } else {
                        var input = $('<input type="text" class="k-input k-textbox" name="ValueString" data-bind:"value:ValueString">');
                        input.appendTo(container);
                    }
                },
            }, {
                field: "UnitOfMeasurement",
                title: txt.TXT_UNIT_OF_MEASUREMENT,
                width: "9%",
                filterable: false,
                template: function (data) {
                    if (data.UnitOfMeasurement == null) {
                        return '';
                    } else if (data.UnitOfMeasurement === '[sec]' && data.TargetUoM === '[min]') {
                        return data.TargetUoM;
                    } else if (data.UnitOfMeasurement === '[sec]' && data.TargetUoM === '[h]') {
                        return data.TargetUoM;
                    } else if (data.UnitOfMeasurement === '[min]' && data.TargetUoM === '[h]') {
                        return data.TargetUoM;
                    } else if (data.UnitOfMeasurement === '' && data.TargetUoM != '') {
                        return data.TargetUoM;
                    } else {
                        return data.UnitOfMeasurement;
                    }
                },
            }, {
                field: "RecordingTime",
                title: txt.TXT_RECORDING_TIME,
                width: "14%",
                    template: "#= kendo.toString(kendo.parseDate(RecordingTime, 'yyyy-MM-dd'), 'dd/MM/yyyy HH:mm') #",
                attributes: {
                    style: "text-align: center;"
                },
            }, {
                field: "LowerLimit",
                title: txt.TXT_LOWER_LIMIT,
                width: "9%",
                attributes: {
                    style: "text-align:right;"
                },
                template: function (data) {
                    if (data.LowerLimit) {
                        return kendo.toString(data.LowerLimit, ((!data.Format) ? 2 : data.Format));
                    } else {
                        return '';
                    }
                }
            }, {
                field: "UpperLimit",
                title: txt.TXT_UPPER_LIMIT,
                width: "9%",
                attributes: {
                    style: "text-align:right;"
                },
                template: function (data) {
                    if (data.UpperLimit) {
                        return kendo.toString(data.UpperLimit, ((!data.Format) ? 2 : data.Format));
                    } else {
                        return '';
                    }
                }
            }, {
                field: "LowerVetoLimit",
                title: txt.TXT_LOWER_LIMIT_PLUS,
                width: "9%",
                attributes: {
                    style: "text-align:right;"
                },
                template: function (data) {
                    if (data.LowerVetoLimit) {
                        return kendo.toString(data.LowerVetoLimit, ((!data.Format) ? 2 : data.Format));
                    } else {
                        return '';
                    }
                }
            }, {
                field: "UpperVetoLimit",
                title: txt.TXT_UPPER_LIMIT_PLUS,
                width: "9%",
                attributes: {
                    style: "text-align:right;"
                },
                template: function (data) {
                    if (data.UpperVetoLimit) {
                        return kendo.toString(data.UpperVetoLimit, ((!data.Format) ? 2 : data.Format));
                    } else {
                        return '';
                    }
                }
            }, {
                field: "Comment",
                title: txt.TXT_COMMENT,
                width: "8%",
                attributes: {
                    style: "text-align: center;"
                },
                template: '<input type="checkbox" #= Comment ? "checked" : "" # disabled="false" ></input>',
                filterable: false
            }, {
                field: "UnitGlobalName",
                groupHeaderTemplate: function (dataItem) {
                    if (dataItem.value != null) {
                        return dataItem.value;
                    }
                    return 'Undefined';
                },
                hidden: true
            }, {
                field: "UnitLocalName",
                groupHeaderTemplate: function (dataItem) {
                    if (dataItem.value != null) {
                        return dataItem.value;
                    }
                    return 'Undefined';
                },
                hidden: true
            }]
        };
    };


    // Optionen für Grid SAPInterfaceMaterialTransfers        
    $scope.gridSAPInterfaceMaterialTransfers = function (dataItem) {
        return {
            dataSource: f_GetDataSourceSAPInterfaceMaterialTransfers(dataItem),
            toolbar: [{
                template: '<button class="k-button k-button-icontext" ng-click="OnGridAddRow($event)"><span class="k-icon k-add"></span> ' + txt.TXT_INSERT_NEW_LINE + '</button>'
            }],
            dataBound: function (e) {

                this.pager.element.hide();

                collapseAllGroups(this);

                // ToolTip
                $scope.gridSAPInterfaceHeaders.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                    $(this).attr('title', $(this).data('title'));
                })

                // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                // dadurch entsteht Speicherverschmiss
                if (m_timeoutSAPInterfaceMaterialTransfersHandle != null) {
                    // ggf. laufenden Timeout stoppen
                    clearTimeout(m_timeoutSAPInterfaceMaterialTransfersHandle);

                    // zurücksetzen
                    m_timeoutSAPInterfaceMaterialTransfersHandle = null;
                }

                if (m_timeoutSAPInterfaceMaterialTransfersHandle == null) {

                    // Timeout starten
                    m_timeoutSAPInterfaceMaterialTransfersHandle = setTimeout(function (grid) {

                        // Timeout abgelaufen
                        m_timeoutSAPInterfaceMaterialTransfersHandle = null;

                        // expandierten Zeilenzustand wiederherstellen
                        if (m_expandedRows) {
                            for (var i = 0; i < grid.tbody.children().length; i++) {
                                var row = $(grid.tbody.children()[i]);
                                var uid = row.data("uid");

                                if (!!grid.dataSource && !!uid) {
                                    var dataItemByUid = grid.dataSource.getByUid(row.data("uid"));

                                    if (!!dataItemByUid) {

                                        for (var j = 0; j < m_expandedRows.length; j++) {
                                            if (m_expandedRows[j] == dataItemByUid.id) {
                                                m_expandedRows[j] = 0;
                                                grid.expandRow(row);
                                            }
                                        }
                                    }
                                    row = undefined;
                                }
                            }
                        }

                        // selektierte Zeilen wiederherstellen
                        if (m_selectedRows) {
                            var selectedRow = undefined;
                            for (var i = 0; i < grid.tbody.children(".k-master-row").length; i++) {
                                var row = $(grid.tbody.children(".k-master-row")[i]);
                                var uid = row.data("uid");

                                if (!!grid.dataSource && !!uid) {
                                    var dataItemByUid = grid.dataSource.getByUid(row.data("uid"));

                                    if (!!dataItemByUid) {

                                        for (var j = 0; j < m_selectedRows.length; j++) {
                                            if (m_selectedRows[j] == dataItemByUid.id) {
                                                selectedRow = row;
                                                break;
                                            }
                                        }
                                        if (!!selectedRow) break;
                                    }
                                    row = undefined;
                                }
                            }

                            if (selectedRow && selectedRow.length > 0) {
                                grid.select(selectedRow[0]);
                            }
                        }
                    }, TIMEOUT_DELAY_DATABOUND, this);


                }

                // ToolTip
                this.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                    $(this).attr('title', $(this).data('title'));
                })
            },
            scrollable: false,
            sortable: true,
            editable: true, // damit update von datasource moeglich ist
            resizable: true,
            selectable: true,

            pageable: {
                pageSizes: true,
                buttonCount: 5
            },
            filterable: {
                extra: false,
                operators: {
                    string: {
                        startswith: txt.TXT_STARTS_WITH,
                        eq: txt.TXT_IS_EQUAL_TO,
                        neq: txt.TXT_IS_NOT_EQUAL_TO
                    }
                }
            },

            detailExpand: function (e) {
                // Zeile vom Elternzeile hervorheben
                e.masterRow.addClass('highlight');
            },
            detailCollapse: function (e) {
                // Hervorhebung von Elternzeile entfernen
                e.masterRow.removeClass('highlight');
            },

            edit: function (e) {
                // Automatische Aktualisierung anhalten und Verzögerung starten
                if ($scope.checkBoxAutomaticRefreshValue == 1) {
                    refresh.StopAutomaticRefresh();
                    refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
                }

                var columnIndex = this.cellIndex(e.container);
                var fieldName = this.thead.find("th").eq(columnIndex + 1).data("field");

                // Detailzeile des Headers ermitteln
                var detailHeaderRow = e.sender.tbody.closest("tr.k-detail-row");

                // passende Kopfzeile ermitteln
                var dataHeaderItem = $scope.gridSAPInterfaceHeaders.dataItem(detailHeaderRow.prev());

                // bearbeitbar? 

                if (e.model.isNew()) {
                    if (EDITABLE_FIELDS_CREATE_SIMT.indexOf(fieldName) < 0) this.closeCell();
                } else {
                    if (EDITABLE_FIELDS_UPDATE_SIMT.indexOf(fieldName) < 0) this.closeCell();
                }
            },

            save: function (e) {
                if (e.values != undefined) {
                    // soll etwas gespeichert werden?
                    e.model._Kendo_SaveIt = 1;
                }
            },

            columns: [{
                field: "StartTime",
                title: txt.TXT_START_TIME,
                template: "#= kendo.toString(kendo.parseDate(StartTime, 'yyyy-MM-dd'), 'dd/MM/yyyy HH:mm') #",
                editor: kendoHelper.getEditorDateTime,
                attributes: {
                    style: "text-align: center;"
                },
                filterable: false
            }, {
                field: "Material",
                width: "20%",
                title: txt.TXT_MATERIAL,
                editor: function (container, options) {
                    if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                        $('<select kendo-combo-box k-min-length="1" k-data-text-field="\'MaterialGlobalName\'" k-data-value-field="\'MaterialGlobalName\'" data-bind="value:' + options.field + '" k-data-source="dataSourceKendoOdsMaterials(undefined)" />').appendTo(container);
                    } else {
                        $('<select kendo-combo-box k-min-length="1" k-data-text-field="\'MaterialLocalName\'" k-data-value-field="\'MaterialLocalName\'" data-bind="value:' + options.field + '" k-data-source="dataSourceKendoOdsMaterials(undefined)" />').appendTo(container);
                    }
                },
                template: function (data) {
                    if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
                        if (data.Material._Key != null) {
                            return data.Material.MaterialGlobalName;
                        }
                        return data.Material.MaterialLocalName;
                    } else {
                        if (data.Material._Key != null) {
                            return data.Material.MaterialLocalName;
                        }
                        return data.Material.MaterialGlobalName;
                    }
                }
            }, {
                field: "Unit",
                title: txt.TXT_UNIT,
                width: "10%",
                editor: function (container, options) {
                    if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                        $('<select kendo-combo-box k-min-length="1" k-data-text-field="\'UnitGlobalName\'"  k-data-value-field="\'_Key\'" data-bind="value:' + options.field + '" k-data-source="dataSourceKendoOdsUnits(undefined)" />').appendTo(container);
                    } else {
                        $('<select kendo-combo-box k-min-length="1" k-data-text-field="\'UnitLocalName\'" k-data-value-field="\'_Key\'" data-bind="value:' + options.field + '" k-data-source="dataSourceKendoOdsUnits(undefined)" />').appendTo(container);
                    }
                },
                template: function (data) {
                    if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
                        if (data.Unit._Key != null) {
                            return data.Unit.UnitGlobalName;
                        }
                        return data.Unit.UnitLocalName;
                    } else {
                        if (data.Unit._Key != null) {
                            return data.Unit.UnitLocalName;
                        }
                        return data.Unit.UnitGlobalName;
                    }
                }
            }, {
                field: "SourceAmount",
                title: txt.TXT_AMOUNT,
                attributes: {
                    style: "text-align: right;"
                },
                template: function (data) {
                  return kendo.toString(data.SourceAmount, "n2");
                },
            }, {
                field: "SourceUnitOfMeasurement",
                title: txt.TXT_UNIT_OF_MEASUREMENT,
                filterable: false,
            }, {
                field: "EmptyFlag",
                title: txt.TXT_EMPTYFLAG,
                attributes: {
                    style: "text-align: center;"
                },
                template: '<input type="checkbox" ng-model="dataItem.EmptyFlag" ng-change="OnCheckBoxEmptyFlagChange(dataItem)"></input>',
                filterable: false
            }, {
                field: "Comment",
                title: txt.TXT_COMMENT,
                attributes: {
                    style: "text-align: center;"
                },
                template: '<input type="checkbox" #= Comment ? "checked" : "" # disabled="false" ></input>',
                filterable: false
            }, {
                field: "Command",
                title: " ",
                template: '<kendo-button class="button-small button-delete button" style="min-width:20px;" ng-click="OnGridDeleteRow($event)"></kendo-button>',
                filterable: false
            }]
        };
    };




    var collapseAllGroups = function (grid) {
        grid.table.find(".k-grouping-row").each(function () {
            grid.collapseGroup(this);
        });
    }



    // Zeile im header löschen
    $scope.OnGridDeleteRow = function (e) {
        if (!e || !e.target) return;

        if (!this.dataItem) return;

        // Datenzeile ermitteln
        var row = $(e.target).closest("tr");

        if (!row) return;

        // Daten & Grid ermitteln
        var data = this.dataItem;
        var grid = row.closest("div[kendo-grid]").data("kendoGrid");

        if (!grid) return;

        // entfernen
        grid.removeRow(row);
        // Daten löschen  

        grid.dataSource.sync();
    };

    function makeId() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 10; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    // Benutzeraktionen

    // Neue Zeile (Detail) wurde hinzugefügt
    $scope.OnGridAddRow = function (e) {
        if (!e || !e.target) return;

        // Detailzeile des Headers ermitteln
        var detailHeaderRow = $(e.target).closest("tr.k-detail-row");

        if (!detailHeaderRow) return;

        // passende Kopfzeile ermitteln
        var dataHeaderItem = $scope.gridSAPInterfaceHeaders.dataItem(detailHeaderRow.prev());

        if (!dataHeaderItem) return;

        // Daten & Grid ermitteln   
        var grid = $(e.target).closest('div[kendo-grid]').data("kendoGrid");

        // Zeile anlegen
        grid.addRow();


        // Mit Defaultwerten belegen
        var data = grid.dataSource.view();

        for (var i = 0; i < data.length; i++) {
            // nur neue Zeilen betrachten
            if (data[i].isNew()) {
                if (data[i]._TransferBatchKey == undefined || data[i]._TransferBatchKey == "") {
                    data[i]._TransferBatchKey = dataHeaderItem._BatchKey;
                }
                if (!data[i].Material || !(typeof data[i].Material === 'object')) {
                    data[i].Material = {
                        _Key: "83000000000",
                        "MaterialLocalName": "Unknown",
                        "MaterialGlobalName": "Unknown"
                    };
                    data[i].MaterialLocalName = "Unknown";
                    data[i].MaterialGlobalName = "Unknown";
                    data[i].Material = new kendo.data.ObservableObject(data[i].Material);
                }
                if (!data[i].Unit || !(typeof data[i].Unit === 'object')) {
                    data[i].Unit = {
                        _Key: "81200000000",
                        "UnitLocalName": "Unknown",
                        "UnitGlobalName": "Unknown"
                    };
                    data[i].UnitLocalName = "Unknown";
                    data[i].UnitGlobalName = "Unknown";
                    data[i].Unit = new kendo.data.ObservableObject(data[i].Unit);
                }
            }
        }
    };

    // Statusänderung StatusPO
    $scope.DisablePO = function (e) {
        $scope.OnActionSaveFocus();

        if (!e || !e.target) return;
        if (!this.dataItem) return;

        // Datenzeile ermitteln
        var row = $(e.target).closest("tr");

        if (!row) return;

        // Daten & Grid ermitteln
        var data = this.dataItem;
        var grid = row.closest("div[kendo-grid]").data("kendoGrid");

        if (!grid) return;

        kendoHelper.setValue(data, grid, 'POSent', new Date());
        kendoHelper.setValue(data, grid, 'StatusPO', STATUS_SIH_MANUAL_OK);
        //kendoHelper.setValue(data, grid, 'PPSent', new Date());
        //kendoHelper.setValue(data, grid, 'StatusPP', STATUS_SIH_MANUAL_OK);
        //kendoHelper.setValue(data, grid, 'QMSent', new Date());
        //kendoHelper.setValue(data, grid, 'StatusQM', STATUS_SIH_MANUAL_OK);

        // in DB übernehmen
        grid.dataSource.sync();
    };

    $scope.DisablePP = function (e) {
        $scope.OnActionSaveFocus();

        // Datenzeile ermitteln
        var row = $(e.target).closest("tr");

        // Daten & Grid ermitteln
        var data = this.dataItem;
        var grid = row.closest("div[kendo-grid]").data("kendoGrid");
        var btn = $(e.target);

        var toDisable = btn.prev(".validate").data("kendoButton");
        toDisable.enable(false);
        kendoHelper.setValue(data, grid, 'PPSent', new Date());
        kendoHelper.setValue(data, grid, 'StatusPP', STATUS_SIH_MANUAL_OK);

        // in DB übernehmen
        grid.dataSource.sync();
    }

    $scope.DisableQM = function (e) {
        $scope.OnActionSaveFocus();

        // Datenzeile ermitteln
        var row = $(e.target).closest("tr");

        // Daten & Grid ermitteln
        var data = this.dataItem;
        var grid = row.closest("div[kendo-grid]").data("kendoGrid");
        var btn = $(e.target);

        var toDisable = btn.prev(".validate").data("kendoButton");
        toDisable.enable(false);
        kendoHelper.setValue(data, grid, 'QMSent', new Date());
        kendoHelper.setValue(data, grid, 'StatusQM', STATUS_SIH_MANUAL_OK);

        // in DB übernehmen
        grid.dataSource.sync();
    }

    // Statusänderung StatusPO
    $scope.OnChangeStateSAPInterfaceHeadersStatusPO = function (e) {
        $scope.OnActionSaveFocus();

        if (!e || !e.target) return;
        if (!this.dataItem) return;

        // Datenzeile ermitteln
        var row = $(e.target).closest("tr");

        if (!row) return;

        // Daten & Grid ermitteln
        var data = this.dataItem;
        var grid = row.closest("div[kendo-grid]").data("kendoGrid");

        if (!grid) return;

        // wenn nicht validiert -> Validieren
        if (data.StatusPO == STATUS_SIH_WAITING) kendoHelper.setValue(data, grid, 'StatusPO', STATUS_SIH_READYFORSEND);

            // Rücksetzen
        else kendoHelper.setValue(data, grid, 'StatusPO', STATUS_SIH_WAITING);

        // in DB übernehmen
        grid.dataSource.sync();
    };

    // Statusänderung  StatusPP
    $scope.OnChangeStateSAPInterfaceHeadersStatusPP = function (e) {
        $scope.OnActionSaveFocus();

        if (!e || !e.target) return;
        if (!this.dataItem) return;

        // Datenzeile ermitteln
        var row = $(e.target).closest("tr");
        if (!row) return;

        // Daten & Grid ermitteln
        var data = this.dataItem;
        var grid = row.closest("div[kendo-grid]").data("kendoGrid");

        if (!grid) return;

        // wenn nicht validiert -> Validieren
        if (data.StatusPP == STATUS_SIH_WAITING) kendoHelper.setValue(data, grid, 'StatusPP', STATUS_SIH_READYFORSEND);

            // Rücksetzen
        else kendoHelper.setValue(data, grid, 'StatusPP', STATUS_SIH_WAITING);

        // in DB übernehmen
        grid.dataSource.sync();
    };

    // Statusänderung  StatusQM
    $scope.OnChangeStateSAPInterfaceHeadersStatusQM = function (e) {
        $scope.OnActionSaveFocus();

        if (!e || !e.target) return;
        if (!this.dataItem) return;

        // Datenzeile ermitteln
        var row = $(e.target).closest("tr");
        if (!row) return;

        // Daten & Grid ermitteln
        var data = this.dataItem;
        var grid = row.closest("div[kendo-grid]").data("kendoGrid");

        if (!grid) return;

        if (data.StatusQM == STATUS_SIH_WAITING) kendoHelper.setValue(data, grid, 'StatusQM', STATUS_SIH_READYFORSEND);

            // Rücksetzen
        else kendoHelper.setValue(data, grid, 'StatusQM', STATUS_SIH_WAITING);

        // in DB übernehmen
        grid.dataSource.sync();
    };

    // Kommentaränderung
    $scope.OnCommentChange = function (dataItem, grid) {

        // Automatische Aktualisierung anhalten und Verzögerung starten
        if ($scope.checkBoxAutomaticRefreshValue == 1) {
            refresh.StopAutomaticRefresh();
            refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
        }
        // Kommentaränderung im Grid 
        var item = grid.dataSource.get(dataItem._Key);

        // geänderten Wert setzen
        kendoHelper.setValue(dataItem, grid, 'Comment', item.Comment);

        // Änderungsbit setzen
        kendoHelper.setChangeBit(dataItem, grid, 'Comment');
        kendoHelper.setCheckBoxChange(dataItem, grid, 'Comment', item.Comment);
    };


    // Checkboxänderung - IsLocked
    $scope.OnCheckBoxIsLockedChange = function (dataItem) {

        // Grid ermitteln
        var masterRow = $scope.gridSAPInterfaceHeaders.tbody.find('tr[data-uid="' + dataItem.uid + '"]')

        if (!masterRow) return;

        var grid = masterRow.closest('div[kendo-grid]').data("kendoGrid");

        if (!grid) return;

        // Änderung im Grid   
        var item = grid.dataSource.get(dataItem._Key);

        // Detailzeile des Headers ermitteln
        var detailHeaderRow = grid.tbody.closest("tr.k-detail-row");

        // passende Kopfzeile ermitteln
        var dataHeaderItem = $scope.gridSAPInterfaceHeaders.dataItem(detailHeaderRow.prev());


        // geänderten Wert setzen
        kendoHelper.setValue(dataItem, grid, 'IsLocked', item.IsLocked);

        // Änderungsbit setzen
        kendoHelper.setChangeBit(dataItem, grid, 'IsLocked');
        kendoHelper.setCheckBoxChange(dataItem, grid, 'IsLocked', item.IsLocked);

        // Automatische Aktualisierung anhalten und Verzögerung starten
        if ($scope.checkBoxAutomaticRefreshValue == 1) {
            refresh.StopAutomaticRefresh();
            refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
        }
    }

    $scope.OnCheckBoxEmptyFlagChange = function (dataItem) {
        dataItem.dirty = true;
    }

    // Refresh in Checkbox wurde geändert
    $scope.OnCheckBoxAutomaticRefreshChange = function () {

        // Automatischen Refresh starten, sofern aktiviert
        if ($scope.checkBoxAutomaticRefreshValue == 1) {
            refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
        }
            // Automatische Aktualisierung stoppen, falls nicht aktiviert
        else {
            refresh.StopAutomaticRefreshDelay();
            refresh.StopAutomaticRefresh();
        }
    };

    $scope.OnActionSaveFocus = function () {
        // Selektierte & expandierte Zeilen merken
        var grid = $scope.gridSAPInterfaceHeaders;
        m_expandedRows = undefined;
        m_expandedRows = $.map(grid.tbody.find(":has(> .k-hierarchy-cell .k-minus)"), function (row) {
            if (!row) return false;

            if (!$(row)) return false;

            if ($(row).closest('[kendo-grid]').length <= 0) return false;

            if (!$(row).closest('[kendo-grid]').data("kendoGrid")) return false;

            if (!$(row).closest('[kendo-grid]').data("kendoGrid").dataSource) return false;

            var uid = $(row).data("uid");
            if (uid == undefined) return false;

            return $(row).closest('[kendo-grid]').data("kendoGrid").dataSource.getByUid(uid).id;
        });
        m_selectedRows = undefined;
        m_selectedRows = $.map(grid.tbody.find(".k-state-selected"), function (row) {
            if (!row) return false;

            if (!$(row)) return false;

            if ($(row).closest('[kendo-grid]').length <= 0) return false;

            if (!$(row).closest('[kendo-grid]').data("kendoGrid")) return false;

            if (!$(row).closest('[kendo-grid]').data("kendoGrid").dataSource) return false;

            var uid = $(row).data("uid");
            if (uid == undefined) return false;

            return $(row).closest('[kendo-grid]').data("kendoGrid").dataSource.getByUid(uid).id;
        });

    }


    // Refresh/Cancel
    $scope.OnGridSAPInterfaceRefresh = function () {

        $scope.OnActionSaveFocus();

        // Init
        if (!m_dataValuesInitialized || !m_dataSourceSAPInterfaceInitialized) 
            return;

            // Request sperren
            m_dataValuesInitialized = false;

            // Filter setzen
            kendoHelper.setDataSourceFilters(m_dataSourceSAPInterfaceHeaders, "BatchProcessStartTime", "gte", $scope.dtSAPInterfaceHeadersStartValue); // gte Kendo Operator
            kendoHelper.setDataSourceFilters(m_dataSourceSAPInterfaceHeaders, "BatchProcessStartTime", "lte", $scope.dtSAPInterfaceHeadersStopValue); // lte Kendo Operator

            // Request entsperren
            m_dataValuesInitialized = true;

            // Daten lesen  
            $scope.gridSAPInterfaceHeaders.dataSource.read();

            // Refreshhandling
            refresh.StopAutomaticRefreshDelay();
            refresh.StopAutomaticRefresh();
            if ($scope.checkBoxAutomaticRefreshValue == 1) {
                refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
            }              

    };

    // Speichern
    $scope.OnGridSAPInterfaceSave = function () {

        $scope.OnActionSaveFocus();

        // Ermittle Aktuelle Seite
        var actualSAPInterfaceHeadersPage = $scope.gridSAPInterfaceHeaders.pager.dataSource.page();

        // Daten zum speichern markieren (Header)
        var data = $scope.gridSAPInterfaceHeaders._data;
        // Speichermarkierung für alle Werte setzen
        if (data) {
            for (i = 0; i < data.length; i++) {
                if (data[i].dirty) {
                    data[i]._Kendo_SaveIt = 1;
                };
            }
        }
        if (data) {
            for (i = 0; i < data.length; i++) {
                // Daten zum speichern markieren (Values)
                if ($scope.gridSAPInterfaceValues) {
                    var dataValues = f_GetDataSourceSAPInterfaceValues(data[i])._data;
                    for (j = 0; j < dataValues.length; j++) {
                        if (dataValues[j].dirty) {
                            dataValues[j]._Kendo_SaveIt = 1;
                        };
                    }
                }
                // Daten zum speichern markieren (Material Transfers)
                if ($scope.gridSAPInterfaceMaterialTransfers) {
                    var dataMatTrans = f_GetDataSourceSAPInterfaceMaterialTransfers(data[i])._data;
                    for (j = 0; j < dataMatTrans.length; j++) {
                        if (dataMatTrans[j].dirty) {
                            dataMatTrans[j]._Kendo_SaveIt = 1;
                        };
                    }
                }
                // Daten zum speichern markieren (Manual Input)
                if ($scope.gridSAPInterfaceManualInput) {
                    var dataManInp = f_GetDataSourceSAPInterfaceManualInput(data[i])._data;
                    for (j = 0; j < dataManInp.length; j++) {
                        if (dataManInp[j].dirty) {
                            dataManInp[j]._Kendo_SaveIt = 1;
                        };
                    }
                }

                // Daten speichern (Detail)
                $scope.gridSAPInterfaceValues(data[i]).dataSource.sync();
                $scope.gridSAPInterfaceMaterialTransfers(data[i]).dataSource.sync();
                $scope.gridSAPInterfaceManualInput(data[i]).dataSource.sync();
            }
        }

        // Daten speichern (Header)
        $scope.gridSAPInterfaceHeaders.dataSource.sync();

        // Seite wieder laden
        if (actualSAPInterfaceHeadersPage > 1) {
            // wieder auf Seite zurückspringen
            $scope.gridSAPInterfaceHeaders.pager.dataSource.page(actualSAPInterfaceHeadersPage);
        }

        // Refreshhandling
        refresh.StopAutomaticRefreshDelay();
        refresh.StopAutomaticRefresh();
        if ($scope.checkBoxAutomaticRefreshValue == 1) {
            refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
        }
    };
}]);