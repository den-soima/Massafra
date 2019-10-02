// App: KendoBatchOverview
var app = angular.module("KendoBatchOverview", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: BatchOverviewCtrl
app.controller("BatchOverviewCtrl", ['$scope', '$timeout', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsEnumerationTexts', 'refresh', 'kendoOdsUnits', 'kendoOdsMaterials',

function ($scope, $timeout, ngDialog, txt, kendoHelper, kendoOdsEnumerationTexts, refresh, kendoOdsUnits, kendoOdsMaterials) {

    // Verweis auf Service      
    $scope.srv_kendoOdsEnumerationTexts = kendoOdsEnumerationTexts;

    // Datenquellen
    $scope.dataSourceEnumerationTexts = kendoOdsEnumerationTexts.getDataSource;


    // Konstanten
    const TIMEINTERVAL_PER_DAY_MS = 86400000;
    const ENUM_STATUS_HEADER = 'Status_BatchOverview'; // Text des Status in Headerspalte
    const EDITABLE_FIELDS_UPDATE_BOH = []; // als Array, welche Felder in BatchOverviewHeader bearbeitbar sind
    const EDITABLE_FIELDS_UPDATE_BOV = ['Value', 'ValueString', 'ValueCombo'];
    const EDITABLE_FIELDS_UPDATE_BOMT = ['Material', 'Unit', 'SourceAmount'];
    const EDITABLE_FIELDS_CREATE_BOMT = ['Material', 'Unit', 'ValueCategory', 'SourceUnitOfMeasurement', 'SourceAmount', 'StartTime'];

    const ENTERPRISE_DEFAULT_KEY = 7000000000;
    const STATUS_BOH_WAITING = "0";
    const STATUS_BOH_READYFORSEND = "1";
    const STATUS_BOH_CONFIRMED = "2";
    const STATUS_BOH_ERROR = "3";

    const TIMEOUT_DELAY_DATABOUND = 500; // notwendig um doppeltes Aufrufen zu vermeiden

    const Classification = ';MANUAL_INPUT;';

    var m_CurrentConfirmKey = "";

    var m_dataValuesInitialized = false;
    var m_dataSourceBatchOverviewInitialized = false;
    var m_dataValuesTabInitialized = false;
    var m_dataManualInputTabInitialized = false;
    var m_dataMatTransfTabInitialized = false;

    var m_dataSourceBatchOverviewManualInputElements = false;
    var m_dataSourceBatchOverviewMaterialTransfersElements = new Array();

    // Aktualisieren des Treeview      
    var m_expandedRows = undefined;
    var m_selectedRows = undefined;

    var m_timeoutBatchOverviewHeaderHandle = null;
    var m_timeoutBatchOverviewValueHandle = new Array();
    var m_timeoutBatchOverviewManualInputHandle = new Array();
    var m_timeoutBatchOverviewMaterialTransfersHandle = new Array();

    var m_ManualInputDSRead = false;
    var m_ValueInputDSRead = false;

    // Struktur: dataSourceElement 
    function c_dataSourceElement(dataItem, dataSource) {
        this.dataItem = dataItem;
        this.dataSource = dataSource;
    };


    // interne Variablen                       
    var m_IsRefreshDelayDialogVisible = false;
    var m_dataSourceBatchOverviewValuesElements = new Array(); // Array mit allen datasource Elementen die in Grid BatchOverviewValues bereits gelesen wurden

    var m_selectedtabStripBatchOverviewHeaders = [];

    var m_pdfExportRunning = false;


    // -------------------------
    // Datenquelle des Grids: BatchOverviewHeader
    var m_dataSourceBatchOverviewHeaders = new kendo.data.DataSource({
        type: "odata-v4",
        transport: {
            read: {
                url: $("#gatewayPath").data("value") + "odata/ods/ZWebBatchOverviews",
                datatype: 'json',
                beforeSend: function (x) {
                    var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                    x.setRequestHeader("Authorization", auth);
                },
                cache: false
            },
            update: {
                url: function (data) {
                    return $("#gatewayPath").data("value") + "odata/ods/ZWebBatchOverviews(" + data._Key + ")";
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
                        return '{  "_Key": "' + data._Key +
                            '", "Comment": "' + data.Comment +
                            '", "ConfirmationState": "' + data.ConfirmationState +
                            '"}';
                    }
                }
                if (operation === "read") {
                    var dataToRead = data;
                    // Filteranpassungen vor Abfrageerstellung
                    if (dataToRead.filter && dataToRead.filter.filters) {
                        for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                            if (dataToRead.filter.filters[i].field == "ConfirmationState")
                                dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value); // damit Nummer abgefragt wird
                            if (dataToRead.filter.filters[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                dataToRead.filter.filters[i].field = "MaterialLocalName";
                            if (dataToRead.filter.filters[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                dataToRead.filter.filters[i].field = "MaterialGlobalName";
                            else if (dataToRead.filter.filters[i].logic == "or") {
                                for (var j = 0; j < dataToRead.filter.filters[i].filters.length; j++) {
                                    if (dataToRead.filter.filters[i].filters[j].field == "ConfirmationState") {
                                        dataToRead.filter.filters[i].filters[j].value = parseInt(dataToRead.filter.filters[i].filters[j].value); // damit Nummer abgefragt wird 
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
                        result.$filter = result.$filter.replace(/ProcessStartTime/g, "cast(ProcessStartTime, Edm.DateTimeOffset)");
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
            if (!m_dataValuesInitialized || !m_dataSourceBatchOverviewInitialized) {
                e.preventDefault();

                // Datenquelle wurde initialisiert
                m_dataSourceBatchOverviewInitialized = true;

            }
        },
        schema: {
            model: {
                id: "_Key",
                fields: {
                    "_Key": {type: "number"},
                    "BrewLine": {type: "string"},
                    "_BatchKey": {type: "number"},
                    "ProcessStartTime": {type: "date"},
                    "CurrentStep": {type: "string"},
                    "BatchName": { type: "string", parse: function (value) { return value.substring(0, value.indexOf(".")) }, editable: false },
                    "MaterialLocalName": {type: "string"},
                    "MaterialGlobalName": {type: "string"},
                    "Comment": {type: "string",defaultValue: ''},
                    "SAP_PO": {type: "string"},
                    "SAP_Batch": { type: "string" },
                    "RequiredValuesPresent": { type: "number" },
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



    var m_dataSourceBatchOverviewValues_ReadRunning = false;

    // -------------------------
    // Datenquelle des Grids: BatchOverviewValues (Hilfsfunktion)
    // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
    var f_GetDataSourceBatchOverviewValues = function (dataItem) {
        if (!m_dataSourceBatchOverviewValuesElements) m_dataSourceBatchOverviewValuesElements = new Array();
        // wenn gefunden, entsprechendes Element zurückgeben
        for (var i = 0; i < m_dataSourceBatchOverviewValuesElements.length; i++) {
            if (m_dataSourceBatchOverviewValuesElements[i].dataItem._Key == dataItem._Key) return m_dataSourceBatchOverviewValuesElements[i].dataSource;
        }
        // Element anlegen
        var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceBatchOverviewValuesElement());

        m_ValueInputDSRead = false;

        // Filter/Sortierung setzen
        kendoHelper.setDataSourceFilters(newElement.dataSource, "_BatchKey", "eq", parseInt(dataItem._Key));
        kendoHelper.setDataSourceSorts(newElement.dataSource, "SortOrder", "asc");
        m_ValueInputDSRead = true;
      
        // Element hinzufügen
        m_dataSourceBatchOverviewValuesElements.push(newElement);
        return newElement.dataSource;
    };

    // Datenquelle des Grids: BatchOverviewValues 
    var f_GetDataSourceBatchOverviewValuesElement = function () {
        var ds = {
            type: "odata-v4",
            transport: {
                read: {
                  url: $("#gatewayPath").data("value") + "odata/ods/ZWebBatchOverviewValues?$select=_Key,_BatchKey,_UnitKey,UnitGlobalName,UnitLocalName,RecordingTime,UnitOfMeasurement,Value,ValueString,ValueCategoryLocalName,ValueCategoryGlobalName,ValueOriginal,ValueStringOriginal,LowerLimit,LowerVetoLimit,UpperLimit,UpperVetoLimit,Comment,Format,TargetUoM,_EnumerationLink,EnumerationTextGlobalName,EnumerationTextLocalName",
                    datatype: 'json',
                    beforeSend: function (xhr) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        xhr.setRequestHeader("Authorization", auth);
                    },
                    cache: false
                },

                update: {
                    url: function (data) {
                        return $("#gatewayPath").data("value") + "odata/ods/ZWebBatchOverviewValues(" + data._Key + ")?$select=_Key,Value,ValueString,Comment";
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
                        m_dataSourceBatchOverviewValues_ReadRunning = true;

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
                            result.$filter = result.$filter.replace(/RecordingTime/g, "cast(RecordingTime, Edm.DateTimeOffset)");
                        }

                        return result;
                    }
                }
            },

            change: function (e) {
                //      Combobox Objekt versorgen
                var data = this._data;


                if (m_dataSourceBatchOverviewValues_ReadRunning) {
                    m_dataSourceBatchOverviewValues_ReadRunning = false;

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
                        "_Key": {type: "number"},
                        "_BatchKey": {type: "number"},
                        "_UnitKey": {type: "string",parse: function (value) {return (!!value || value != null) ? value : 0}                        },
                        "UnitLocalName": {type: "string",parse: function (value) {return (!!value || value != null) ? value : "Undefined"}},
                        "UnitGlobalName": {type: "string",parse: function (value) {return (!!value || value != null) ? value : "Undefined"}},
                        "RecordingTime": {type: "date"},
                        "UnitOfMeasurement": {type: "string",defaultValue: 'HLT'},
                        "Value": {type: "number"},
                        "TargetUoM": {type: "string"},
                        "_EnumerationLink": {type: "string"},
                        "EnumerationTextLocalName": {type: "string",parse: function (value) {return (value === null) ? "" : value;}},
                        "EnumerationTextGlobalName": {type: "string",parse: function (value) {return (value === null) ? "" : value;}},
                        "ValueCombo": {type: "string",parse: function (value) {return (value === undefined) ? {TextNumber: undefined,EnumerationTextLocalName: "",EnumerationTextGlobalName: ""} : value;},},
                        "ValueString": {type: "string"},
                        "ValueStringOriginal": {type: "string"},
                        "ValueOriginal": {type: "number"},
                        "ValueName": {type: "string",parse: function (value) {return (value === undefined || value === null) ? {} : value;}},
                        "ValueCategoryLocalName": {type: "string"},
                        "ValueCategoryGlobalName": {type: "string"},
                        "LowerLimit": {type: "number",parse: function (value) {return (value === null) ? undefined : value;}},
                        "LowerVetoLimit": {type: "number",parse: function (value) {return (value === null) ? undefined : value;}},
                        "UpperLimit": {type: "number",parse: function (value) {return (value === null) ? undefined : value;}},
                        "UpperVetoLimit": {type: "number",parse: function (value) {return (value === null) ? undefined : value;}},
                        "Comment": {type: "string",defaultValue: ''},
                        "Command": {type: "string",parse: function (value) {return 0;}},
                        "Format": {type: "number",parse: function (value) {return (value === null) ? 0 : value;}},
                        "_Kendo_SaveIt": {type: "number",defaultValue: 0,parse: function (value) {return 0;}},
                    }
                }
            },
            batch: false,
            pageable: false,
            serverPaging: false,
            serverSorting: true,
            serverFiltering: true,

            Groupp: {
                field: ""
            }
        };


        if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
            ds.Groupp.field = "UnitGlobalName";
        } else {
            ds.Groupp.field = "UnitLocalName";
        }
        ds = new kendo.data.DataSource(ds);
        return ds;


    };



    // -------------------------
    // Datenquelle des Grids: BatchOverviewManualInput (Hilfsfunktion)
    // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
    var f_GetDataSourceBatchOverviewManualInput = function (dataItem) {
        if (!m_dataSourceBatchOverviewManualInputElements) m_dataSourceBatchOverviewManualInputElements = new Array();
        // wenn gefunden, entsprechendes Element zurückgeben
        for (var i = 0; i < m_dataSourceBatchOverviewManualInputElements.length; i++) {
            if (m_dataSourceBatchOverviewManualInputElements[i].dataItem._Key == dataItem._Key) return m_dataSourceBatchOverviewManualInputElements[i].dataSource;
        }
        // Element anlegen
        var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceBatchOverviewManualInputElement());

        m_ManualInputDSRead = false;
        // Filter/Sortierung setzen
        kendoHelper.setDataSourceFilters(newElement.dataSource, "_BatchKey", "eq", parseInt(dataItem._Key));
        kendoHelper.setDataSourceSorts(newElement.dataSource, "SortOrder", "asc");
        m_ManualInputDSRead = true;

        // Element hinzufügen
        m_dataSourceBatchOverviewManualInputElements.push(newElement);
        return newElement.dataSource;
    };


    var m_dataSourceBatchOverviewManualValues_ReadRunning = false;

    // Datenquelle des Grids: BatchOverviewManualInput 
    var f_GetDataSourceBatchOverviewManualInputElement = function () {
        var ds = {
            type: "odata-v4",
            transport: {
                read: {
                    url: $("#gatewayPath").data("value") + "odata/ods/ZWebBatchOverviewValues?$select=_Key,_BatchKey,_UnitKey,UnitGlobalName,RecordingTime,UnitOfMeasurement,Value,ValueString,ValueCategoryLocalName,ValueCategoryGlobalName,ValueOriginal,ValueStringOriginal,LowerLimit,LowerVetoLimit,UpperLimit,UpperVetoLimit,Comment,Format,TargetUoM,_EnumerationLink,EnumerationTextGlobalName,EnumerationTextLocalName",
                    datatype: 'json',
                    beforeSend: function (xhr) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        xhr.setRequestHeader("Authorization", auth);
                    },
                    cache: false
                },

                update: {
                    url: function (data) {
                        return $("#gatewayPath").data("value") + "odata/ods/ZWebBatchOverviewValues(" + data._Key + ")?$select=_Key,Value,ValueString,Comment";
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
                        m_dataSourceBatchOverviewManualValues_ReadRunning = true;

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
                            result.$filter = result.$filter.replace(/RecordingTime/g, "cast(RecordingTime, Edm.DateTimeOffset)");
                        }

                        return result;
                    }
                }
            },

            filter: {field: "Classifications",operator: "contains",value: Classification},


            change: function (e) {
                //      Combobox Objekt versorgen
                var data = this._data;

                if (m_dataSourceBatchOverviewManualValues_ReadRunning) {
                    m_dataSourceBatchOverviewManualValues_ReadRunning = false;

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


    function makeId() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 10; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    // -------------------------
    // Datenquelle des Grids: BatchOverviewMaterialTransfers (Hilfsfunktion)
    // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
    var f_GetDataSourceBatchOverviewMaterialTransfers = function (dataItem) {
        if (!m_dataSourceBatchOverviewMaterialTransfersElements) m_dataSourceBatchOverviewMaterialTransfersElements = new Array();
        // wenn gefunden, entsprechendes Element zurückgeben
        for (var i = 0; i < m_dataSourceBatchOverviewMaterialTransfersElements.length; i++) {
            if (m_dataSourceBatchOverviewMaterialTransfersElements[i].dataItem._Key == dataItem._Key) return m_dataSourceBatchOverviewMaterialTransfersElements[i].dataSource;
        }
        // Element anlegen
        var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceBatchOverviewMaterialTransfersElement());

        // Filter/Sortierung setzen
        kendoHelper.setDataSourceFilters(newElement.dataSource, "_TransferBatchKey", "eq", parseInt(dataItem._Key));


        // Element hinzufügen
        m_dataSourceBatchOverviewMaterialTransfersElements.push(newElement);
        return newElement.dataSource;
    };

    // Datenquelle des Grids: BatchOverviewMaterialTransfers 
    var f_GetDataSourceBatchOverviewMaterialTransfersElement = function () {
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
                        return $("#gatewayPath").data("value") + "odata/ods/ZWebTransferSources(" + data._Key + ")?$expand=Material($select=_Key,MaterialLocalName,MaterialGlobalName),Unit($select=_Key,UnitLocalName,UnitGlobalName)&$select=_Key,_TransferBatchKey,SourceUnitOfMeasurement,SourceAmount,StartTime,Comment,_Name,_EnterpriseKey,_SourceMaterialKey,_SourceUnitKey,EmptyFlag";
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
                            '","SourceAmount": "' + ((data.SourceAmount == null) ? 0 : data.SourceAmount) +
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
                    } else if (operation === "update") {
                        if (data._Kendo_SaveIt == 1) {
                            data._Kendo_SaveIt = 0;
                            return '{ "_Key": "' + data._Key +
                                '", "Comment": "' + data.Comment +
                                '","_Name": "' + data._Name +
                                '","_SourceMaterialKey": "' + ((!data.Material) ? MATERIAL_DEFAULT_KEY : data.Material._Key) +
                                '","_SourceUnitKey": "' + ((!data.Unit) ? UNIT_DEFAULT_KEY : data.Unit._Key) +
                                '","SourceAmount": "' + ((data.SourceAmount == null || data.SourceAmount == "") ? 0 :  + data.SourceAmount) +
                                '","EmptyFlag": "' + ((data.EmptyFlag) ? "1" : "0") +
                                '"}';
                        }
                    } else if (operation === "read") {
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


    // interne Funktionen

    // Refresh events
    var f_OnAutomaticRefreshElapsed = function () {
        // Ermittle aktuelle Seite
        var actualBatchOverviewHeadersPage = $scope.gridBatchOverviewHeaders.pager.dataSource.page();

        // Nur wenn auf Seite 1 die Aktualisierung anstoßen
        if (!actualBatchOverviewHeadersPage || actualBatchOverviewHeadersPage == 1) {
            // aktualisieren
            $scope.OnGridBatchOverviewRefresh();
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
                    $scope.OnGridBatchOverviewSave();

                    // normale Aktualisierung
                    if ($scope.checkBoxAutomaticRefreshValue == 1) refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
                }
                    // Antwort: cancel and continue
                else if (data.value == 2) {
                    refresh.StopAutomaticRefreshDelay();
                    // speichern
                    $scope.OnGridBatchOverviewRefresh();
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
                    $scope.OnGridBatchOverviewRefresh();
                    // normale Aktualisierung
                    if ($scope.checkBoxAutomaticRefreshValue == 1) refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
                }
            } finally {
                // Dialog wurde ausgeblendet
                m_IsRefreshDelayDialogVisible = false;
            }

        });
    };

    // ----------------------------------------
    // Init
    $scope.OnInitBatchOverviewHeaders = function () {

      $("#disabled").kendoButton({
        enable: false
      });


        // Status Initialisieren                                          
        kendoOdsEnumerationTexts.init(ENUM_STATUS_HEADER);

        // Filter setzen
        kendoHelper.setDataSourceFilters(m_dataSourceBatchOverviewHeaders, "ProcessStartTime", "gte", $scope.dtBatchOverviewHeadersStartValue); // gte Kendo Operator
        kendoHelper.setDataSourceFilters(m_dataSourceBatchOverviewHeaders, "ProcessStartTime", "lte", $scope.dtBatchOverviewHeadersStopValue); // lte Kendo Operator
        //kendoHelper.setDataSourceFilters(m_dataSourceBatchOverviewHeaders, "ConfirmationState", "neq", 2);


        // Sortierung setzen
        kendoHelper.setDataSourceSorts(m_dataSourceBatchOverviewHeaders, "ProcessStartTime", "desc");




        // Werte initialisiert
        m_dataValuesInitialized = true;

        // Datenquelle zuweisen
        $scope.gridBatchOverviewHeaders.dataSource = m_dataSourceBatchOverviewHeaders;

        // Datenquelle lesen
        $scope.gridBatchOverviewHeaders.dataSource.read();

        // Autorefresh starten
        $scope.OnCheckBoxAutomaticRefreshChange();
    };

    // ----------------------------------------
    // Checkbox für Automatische Aktualisierung
    $scope.checkBoxAutomaticRefreshValue = 1;

    // DateTimePicker für StartTime                                              
    $scope.dtBatchOverviewHeadersStopValue = new Date(new Date(new Date().getTime() + 7 * TIMEINTERVAL_PER_DAY_MS));
    $scope.dtBatchOverviewHeadersStartValue = new Date(new Date(new Date().getTime() - 7 * TIMEINTERVAL_PER_DAY_MS));



    // ----------------------------------------
    // Änderungen an Datums/Zeitauswahl - StartTime - Start
    $scope.dateTimePickerBatchOverviewHeadersStart = {
        change: function () {
            $scope.OnGridBatchOverviewRefresh();
        }
    };

    // Änderungen an Datums/Zeitauswahl - StartTime - Stop
    $scope.dateTimePickerBatchOverviewHeadersStop = {
        change: function () {
            $scope.OnGridBatchOverviewRefresh();
        }
    };


    // Optionen für Grid BatchOverviewHeader
    $scope.gridBatchOverviewHeaders = {
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
                $scope.OnGridBatchOverviewRefresh();
            });

        },
        excel: {
            fileName: txt.TXT_SAP_INTERFACE + "-" + new Date() + ".xlsx",
            allPages: true
        },
        dataBound: function (e) {
            var actualBatchOverviewHeadersPage = $scope.gridBatchOverviewHeaders.pager.dataSource.page();

            // Seite wieder laden
            if (actualBatchOverviewHeadersPage > 1 && $scope.checkBoxAutomaticRefreshValue == 1) {
                refresh.StopAutomaticRefresh();
                refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsedPage);
            }

            // Einfärben
            var gridData = this.dataSource.view();

            for (var i = 0; i < gridData.length; i++) {
                // Wenn der Wert nicht bekannt ist, ignorieren
                if (gridData[i].StatusPO === undefined || gridData[i].StatusPP === undefined || gridData[i].StatusQM === undefined) continue;

                if (gridData[i].StatusPO === STATUS_BOH_ERROR) {
                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[10]).addClass("gridCellOutOfSpecVeto");
                }
                if (gridData[i].StatusPP === STATUS_BOH_ERROR) {
                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[11]).addClass("gridCellOutOfSpecVeto");
                }
                if (gridData[i].StatusQM === STATUS_BOH_ERROR) {
                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[12]).addClass("gridCellOutOfSpecVeto");
                }
            };

            // ToolTip
            $scope.gridBatchOverviewHeaders.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                $(this).attr('title', $(this).data('title'));
            })

            // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
            // dadurch entsteht Speicherverschmiss
            if (m_timeoutBatchOverviewHeaderHandle != null) {
                // ggf. laufenden Timeout stoppen
                clearTimeout(m_timeoutBatchOverviewHeaderHandle);

                // zurücksetzen
                m_timeoutBatchOverviewHeaderHandle = null;
            }

            if (m_timeoutBatchOverviewHeaderHandle == null) {

                // Timeout starten
                m_timeoutBatchOverviewHeaderHandle = setTimeout(function (grid) {

                    // Timeout abgelaufen
                    m_timeoutBatchOverviewHeaderHandle = null;

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

            if (EDITABLE_FIELDS_UPDATE_BOH.indexOf(fieldName) < 0) this.closeCell();

            // Automatische Aktualisierung anhalten und Verzögerung starten
            if ($scope.checkBoxAutomaticRefreshValue == 1 && EDITABLE_FIELDS_UPDATE_BOH.indexOf(fieldName) >= 0) {
                refresh.StopAutomaticRefresh();
                refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
            }
        },

        // columnMenu: true,
        columns: [{
            field: "BrewLine",
            title: txt.TXT_BREWLINE,
            width: "3.6%",
        }, {
            field: "BatchName",
            title: txt.TXT_BATCH_NAME,
        }, {
            field: "ProcessStartTime",
            title: txt.TXT_PROCESS_START_TIME,
            editor: kendoHelper.getEditorDateTime,
           template: "#= kendo.toString(kendo.parseDate(ProcessStartTime, 'yyyy-MM-dd'), 'dd/MM/yyyy HH:mm') #",
            attributes: {
                style: "text-align: center;"
            },
            filterable: false
        }, {
            field: "Material",
            title: txt.TXT_MATERIAL,
            attributes: {
                style: "text-align: center;"
            },
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
            field: "SAP_PO",
            title: txt.TXT_SAP_PO,
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
            field: "SAP_Batch",
            title: txt.TXT_SAP_BATCH,
            attributes: {
                style: "text-align: center;"
            },
        }, {
            field: "Comment",
            title: txt.TXT_COMMENT,
            attributes: {
                style: "text-align: center;"
            },
            template: '<input type="checkbox" #= Comment ? "checked" : "" # disabled="false" ></input>',
            filterable: false
        }, {
            field: "ConfirmationState",
            title: txt.TXT_STATUS,
            attributes: {
                style: "text-align: center;"
            },
            template: function (dataItem) {
                if (dataItem.ConfirmationState == STATUS_BOH_WAITING) {
                  if (dataItem.RequiredValuesPresent != 0) {
                    return '<button kendo-button class="validate" ng-click="OnChangeStateBatchOverviewHeadersStatus($event)">' + txt.TXT_CONFIRM + '</button>'
                  } else {
                    return '<button kendo-button disabled="disabled" class="validate" title="' + txt.TXT_REQUIREDMISSING + '" ng-click="OnChangeStateBatchOverviewHeadersStatus($event)">' + txt.TXT_CONFIRM + '</button>'
                  }

                } else if (dataItem.ConfirmationState == STATUS_BOH_CONFIRMED) {
                    return '<button kendo-button class="reset" ng-click="OnChangeStateBatchOverviewHeadersStatus($event)">' + txt.TXT_RESET + '</button>' +
                        '<br>' + txt.TXT_CONFIRMED + '</ br>'
                } else if (dataItem.ConfirmationState == STATUS_BOH_ERROR) {
                    return '<button kendo-button class="reset" ng-click="OnChangeStateBatchOverviewHeadersStatus($event)">' + txt.TXT_RESET + '</button>' +
                        '<br>' + txt.TXT_ERROR + '</ br>'
                } else if (dataItem.ConfirmationState == STATUS_BOH_READYFORSEND) {
                    return '<button kendo-button class="reset" ng-click="OnChangeStateBatchOverviewHeadersStatus($event)">' + txt.TXT_RESET + '</button>' +
                        '<br>' + txt.TXT_WAITING + '</ br>'
                } else return '<br>' + '</ br>'
            },
            filterable: {
                multi: true,
                dataSource: kendoOdsEnumerationTexts.getDataSource(ENUM_STATUS_HEADER),
                itemTemplate: function (e) {
                    if (e.field == "all") {
                        //handle the check-all checkbox template
                        return "<div><label><strong><input type='checkbox' />#= all#</strong></label></div><br />";
                    } else {
                        //handle the other checkboxes
                        return "<span><label><input type='checkbox' name='" + e.field + "' value='#=TextNumber#'/><span>#= angular.element(\'\\#BatchOverviewCtrl\').scope().srv_kendoOdsEnumerationTexts.getText(data.TextNumber, \'" + ENUM_STATUS_HEADER + "\')  #</span></label></span><br />"
                    }
                }
            },
        }]
    };


    // Optionen für Grid BatchOverviewValues        
    $scope.gridBatchOverviewValues = function (dataItem) {
        return {
            dataSource: f_GetDataSourceBatchOverviewValues(dataItem),
            dataBound: function (e) {

                this.pager.element.hide();
                collapseAllGroupps(this);

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



                // ToolTip
                $scope.gridBatchOverviewHeaders.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                    $(this).attr('title', $(this).data('title'));
                })

                // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                // dadurch entsteht Speicherverschmiss
                if (m_timeoutBatchOverviewValueHandle[dataItem.id] != null) {
                    // ggf. laufenden Timeout stoppen
                    clearTimeout(m_timeoutBatchOverviewValueHandle[dataItem.id]);

                    // zurücksetzen
                    m_timeoutBatchOverviewValueHandle[dataItem.id] = null;
                }


                if (m_timeoutBatchOverviewValueHandle[dataItem.id] == null) {

                    // Timeout starten
                    m_timeoutBatchOverviewValueHandle[dataItem.id] = setTimeout(function (grid) {

                        // Timeout abgelaufen
                        m_timeoutBatchOverviewValueHandle[dataItem.id] = null;

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
                        neq: txt.TXT_IS_NOT_EQUAL_TO,
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
                var dataHeaderItem = $scope.gridBatchOverviewHeaders.dataItem(detailHeaderRow.prev());
                // bearbeitbar? 
                if (EDITABLE_FIELDS_UPDATE_BOV.indexOf(fieldName) < 0 || dataHeaderItem.IsComplete == 1) this.closeCell();
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

                  if (data._Key == 42000574074) {
                    var stop = 1;

                  }

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
                        return kendo.toString(data.LowerLimit, +((!data.Format) ? 2 : data.Format));
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
                GrouppHeaderTemplate: function (dataItem) {
                    if (dataItem.value != null) {
                        return dataItem.value;
                    }
                    return 'Undefined';
                },
                hidden: true
            }, {
                field: "UnitLocalName",
                GrouppHeaderTemplate: function (dataItem) {
                    if (dataItem.value != null) {
                        return dataItem.value;
                    }
                    return 'Undefined';
                },
                hidden: true
            }]
        };
    };

    // Optionen für Grid BatchOverviewManualInput        
    $scope.gridBatchOverviewManualInput = function (dataItem) {
        return {
            dataSource: f_GetDataSourceBatchOverviewManualInput(dataItem),
            dataBound: function (e) {

                this.pager.element.hide();

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


                // ToolTip
                $scope.gridBatchOverviewHeaders.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                    $(this).attr('title', $(this).data('title'));
                })

                // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                // dadurch entsteht Speicherverschmiss
                if (m_timeoutBatchOverviewManualInputHandle[dataItem.id] != null) {
                    // ggf. laufenden Timeout stoppen
                    clearTimeout(m_timeoutBatchOverviewManualInputHandle[dataItem.id]);

                    // zurücksetzen
                    m_timeoutBatchOverviewManualInputHandle[dataItem.id] = null;
                }

                if (m_timeoutBatchOverviewManualInputHandle[dataItem.id] == null) {

                    // Timeout starten
                    m_timeoutBatchOverviewManualInputHandle[dataItem.id] = setTimeout(function (grid) {

                        // Timeout abgelaufen
                        m_timeoutBatchOverviewManualInputHandle[dataItem.id] = null;

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
                        neq: txt.TXT_IS_NOT_EQUAL_TO,
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
                var dataHeaderItem = $scope.gridBatchOverviewHeaders.dataItem(detailHeaderRow.prev());
                // bearbeitbar? 
                if (EDITABLE_FIELDS_UPDATE_BOV.indexOf(fieldName) < 0 || dataHeaderItem.IsComplete == 1) this.closeCell();
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
                field: "LowerLimit",
                title: txt.TXT_LOWER_LIMIT,
                width: "9%",
                attributes: {
                    style: "text-align:right;"
                },
                template: function (data) {
                    if (data.LowerLimit) {
                        return kendo.toString(data.LowerLimit,((!data.Format) ? 2 : data.Format));
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
                GrouppHeaderTemplate: function (dataItem) {
                    if (dataItem.value != null) {
                        return dataItem.value;
                    }
                    return 'Undefined';
                },
                hidden: true
            }, {
                field: "UnitLocalName",
                GrouppHeaderTemplate: function (dataItem) {
                    if (dataItem.value != null) {
                        return dataItem.value;
                    }
                    return 'Undefined';
                },
                hidden: true
            }]
        };
    };

    // Datenquelle für Unit/Material
    $scope.dataSourceKendoOdsUnits = kendoOdsUnits.getDataSource;
    $scope.dataSourceKendoOdsMaterials = kendoOdsMaterials.getDataSource;

    // Optionen für Grid BatchOverviewMaterialTransfers        
    $scope.gridBatchOverviewMaterialTransfers = function (dataItem) {
        return {
            dataSource: f_GetDataSourceBatchOverviewMaterialTransfers(dataItem),
            toolbar: [{
                template: '<button class="k-button k-button-icontext" ng-click="OnGridAddRow($event)"><span class="k-icon k-add"></span> ' + txt.TXT_INSERT_NEW_LINE + '</button>'
            }],
            dataBound: function (e) {

                this.pager.element.hide();

                // ToolTip
                $scope.gridBatchOverviewHeaders.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                    $(this).attr('title', $(this).data('title'));
                })

                // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                // dadurch entsteht Speicherverschmiss
                if (m_timeoutBatchOverviewMaterialTransfersHandle != null) {
                    // ggf. laufenden Timeout stoppen
                    clearTimeout(m_timeoutBatchOverviewMaterialTransfersHandle);

                    // zurücksetzen
                    m_timeoutBatchOverviewMaterialTransfersHandle = null;
                }

                if (m_timeoutBatchOverviewMaterialTransfersHandle == null) {

                    // Timeout starten
                    m_timeoutBatchOverviewMaterialTransfersHandle = setTimeout(function (grid) {

                        // Timeout abgelaufen
                        m_timeoutBatchOverviewMaterialTransfersHandle = null;

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

                // Defaultwerte anlegen
                if (e.model.isNew()) {

                    if (!e.model.Material || !(typeof e.model.Material === 'object')) {
                        e.model.Material = {
                            _Key: "83000000000",
                            "MaterialLocalName": "Unknown",
                            "MaterialGlobalName": "Unknown"
                        };
                        e.model.MaterialLocalName = "Unknown";
                        e.model.MaterialGlobalName = "Unknown";
                        e.model.Material = new kendo.data.ObservableObject(e.model.Material);
                    }
                    if (!e.model.Unit || !(typeof e.model.Unit === 'object')) {
                        e.model.Unit = {
                            _Key: "81200000000",
                            "UnitLocalName": "Unknown",
                            "UnitGlobalName": "Unknown"
                        };
                        e.model.UnitLocalName = "Unknown";
                        e.model.UnitGlobalName = "Unknown";
                        e.model.Unit = new kendo.data.ObservableObject(e.model.Unit);
                    }
                }

                // bearbeitbar? 

                if (e.model.isNew()) {
                    if (EDITABLE_FIELDS_CREATE_BOMT.indexOf(fieldName) < 0) this.closeCell();
                } else {
                    if (EDITABLE_FIELDS_UPDATE_BOMT.indexOf(fieldName) < 0) this.closeCell();
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
                template: "#= kendo.toString(kendo.parseDate(StartTime, 'yyyy-MM-dd'), 'dd/MM/yyyy') #",
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
    var collapseAllGroupps = function (grid) {
        grid.table.find(".k-Groupping-row").each(function () {
            grid.collapseGroupp(this);
        });
    }


    // Benutzeraktionen
    $scope.OnCheckBoxEmptyFlagChange = function (dataItem) {
        dataItem.dirty = true;
    }
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
        var grid = $scope.gridBatchOverviewHeaders;
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
    $scope.OnGridBatchOverviewRefresh = function () {


        $scope.OnActionSaveFocus();

        // Init
        if (!m_dataValuesInitialized || !m_dataSourceBatchOverviewInitialized) return;

        // Request sperren
        m_dataValuesInitialized = false;

        // Filter setzen
        kendoHelper.setDataSourceFilters(m_dataSourceBatchOverviewHeaders, "ProcessStartTime", "gte", $scope.dtBatchOverviewHeadersStartValue); // gte Kendo Operator
        kendoHelper.setDataSourceFilters(m_dataSourceBatchOverviewHeaders, "ProcessStartTime", "lte", $scope.dtBatchOverviewHeadersStopValue); // lte Kendo Operator

        // Request entsperren
        m_dataValuesInitialized = true;

        // Daten lesen  
        $scope.gridBatchOverviewHeaders.dataSource.read();

        // Refreshhandling
        refresh.StopAutomaticRefreshDelay();
        refresh.StopAutomaticRefresh();
        if ($scope.checkBoxAutomaticRefreshValue == 1) {
            refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
        }
    };


    $scope.OnGridAddRow = function (e) {
        if (!e || !e.target) return;

        if (!this.dataItem) return;

        // Detailzeile des Headers ermitteln
        var detailHeaderRow = $(e.target).closest("tr.k-detail-row");

        if (!detailHeaderRow) return;

        // passende Kopfzeile ermitteln
        var dataHeaderItem = $scope.gridBatchOverviewHeaders.dataItem(detailHeaderRow.prev());

        if (!dataHeaderItem) return;

        // Daten & Grid ermitteln   
        var grid = $(e.target).closest('div[kendo-grid]').data("kendoGrid");

        // Zeile einfügen
        grid.addRow();

        // Mit Defaultwerten belegen
        var data = grid.dataSource.view();

        for (var i = 0; i < data.length; i++) {
            // nur neue Zeilen betrachten
            if (data[i].isNew()) {
                if (data[i]._TransferBatchKey == undefined || data[i]._TransferBatchKey == "") {
                    data[i]._TransferBatchKey = dataHeaderItem._Key;
                }
            }
        }
    };


    $scope.OnChangeStateBatchOverviewHeadersStatus = function (e) {
        if ($scope.checkBoxAutomaticRefreshValue == 1) refresh.StopAutomaticRefresh(f_OnAutomaticRefreshDelayElapsed);

        if (!e || !e.target) return;
        if (!this.dataItem) return;

        // Datenzeile ermitteln
        var row = $(e.target).closest("tr");
        if (!row) return;

        // Daten & Grid ermitteln
        var dataItem = this.dataItem;
        var grid = row.closest("div[kendo-grid]").data("kendoGrid");

        if (!grid) return;

        m_CurrentConfirmKey = dataItem._Key;

        if (dataItem.ConfirmationState == STATUS_BOH_WAITING) {
            var dlg = ngDialog.open({
                template: 'modalDialogConfirmTemplate',
                scope: $scope
            });
            dlg.closePromise.then(function (data) {
                try {
                    // Antwort: continue
                    if (data.value == 0) {

                    }
                        // Antwort: save and continue
                    else if (data.value == 1) {

                        kendoHelper.setValue(dataItem, grid, 'ConfirmationState', STATUS_BOH_READYFORSEND);


                        // speichern
                        $scope.OnGridBatchOverviewSave();
                      //Brew report erstellen (kurze Wartezeit zum Speichern)
                      //Aufgrund von Problemen als Job in die Datenbank verlegt
                        //$timeout(function () {
                        //    var req = new XMLHttpRequest();
                        //    req.open("GET", "BatchOverview/CreateBrewReport?_BatchKey=" + m_CurrentConfirmKey);
                        //    req.send(null);
                        //}, 500);

                    }
                        // Antwort: cancel and refresh
                    else if (data.value == 2) {
                        refresh.StopAutomaticRefreshDelay();
                        // speichern
                        kendoHelper.setValue(dataItem, grid, 'ConfirmationState', STATUS_BOH_WAITING);
                        $scope.OnGridBatchOverviewRefresh();
                        // normale Aktualisierung
                        if ($scope.checkBoxAutomaticRefreshValue == 1) refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
                    }
                } finally {
                    // Dialog wurde ausgeblendet
                    m_IsRefreshDelayDialogVisible = false;
                }
            });

        }
        else
            kendoHelper.setValue(dataItem, grid, 'ConfirmationState', STATUS_BOH_WAITING);
        $scope.gridBatchOverviewHeaders.dataSource.sync();
    };

    // Speichern
    $scope.OnGridBatchOverviewSave = function () {

        $scope.OnActionSaveFocus();

        // Ermittle Aktuelle Seite
        var actualBatchOverviewHeadersPage = $scope.gridBatchOverviewHeaders.pager.dataSource.page();

        // Daten zum speichern markieren (Header)
        var data = $scope.gridBatchOverviewHeaders._data;
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
                if ($scope.gridBatchOverviewValues) {
                    var dataValues = f_GetDataSourceBatchOverviewValues(data[i])._data;
                    for (j = 0; j < dataValues.length; j++) {
                        if (dataValues[j].dirty) {
                            dataValues[j]._Kendo_SaveIt = 1;
                        };
                    }
                }
                // Daten zum speichern markieren (Material Transfers)
                if ($scope.gridBatchOverviewMaterialTransfers) {
                    var dataMatTrans = f_GetDataSourceBatchOverviewMaterialTransfers(data[i])._data;
                    for (j = 0; j < dataMatTrans.length; j++) {
                        if (dataMatTrans[j].dirty) {
                            dataMatTrans[j]._Kendo_SaveIt = 1;
                        };
                    }
                }
                // Daten zum speichern markieren (Manual Input)
                if ($scope.gridBatchOverviewManualInput) {
                    var dataManInp = f_GetDataSourceBatchOverviewManualInput(data[i])._data;
                    for (j = 0; j < dataManInp.length; j++) {
                        if (dataManInp[j].dirty) {
                            dataManInp[j]._Kendo_SaveIt = 1;
                        };
                    }
                }

                // Daten speichern (Detail)
                $scope.gridBatchOverviewValues(data[i]).dataSource.sync();
                $scope.gridBatchOverviewMaterialTransfers(data[i]).dataSource.sync();
                $scope.gridBatchOverviewManualInput(data[i]).dataSource.sync();
            }
        }

        // Daten speichern (Header)
        $scope.gridBatchOverviewHeaders.dataSource.sync();

        // Seite wieder laden
        if (actualBatchOverviewHeadersPage > 1) {
            // wieder auf Seite zurückspringen
            $scope.gridBatchOverviewHeaders.pager.dataSource.page(actualBatchOverviewHeadersPage);
        }

        // Refreshhandling
        refresh.StopAutomaticRefreshDelay();
        refresh.StopAutomaticRefresh();
        if ($scope.checkBoxAutomaticRefreshValue == 1) {
            refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
        }
    };
}]);