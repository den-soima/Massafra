// App: KendoBatchOverview
var app = angular.module("KendoDosingBatchManagement", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: BatchOverviewCtrl
app.controller("DosingBatchManagementCtrl", ['$scope', '$timeout', 'ngDialog', 'txt', 'kendoHelper', 'refresh', 'kendoOdsMaterials',

function ($scope, $timeout, ngDialog, txt, kendoHelper, refresh, kendoOdsMaterials) {


    // Konstanten
    const TIMEINTERVAL_PER_DAY_MS = 86400000;

    const EDITABLE_FIELDS_UPDATE_BM = ['BatchName','AlphaAcid','Comment']; // als Array, welche Felder in DosingBatchManagement bearbeitbar sind

    const ENTERPRISE_DEFAULT_KEY = 7000000000;

    const TIMEOUT_DELAY_DATABOUND = 500; // notwendig um doppeltes Aufrufen zu vermeiden


    var m_dataValuesInitialized = false;
    var m_dataSourceDosingBatchManagementInitialized = false;

    var m_selectedRows = undefined;

    var m_timeoutDosingBatchManagementHandle = null;

    var m_pdfExportRunning = false;


    // -------------------------
  // Datenquelle des Grids: DosingBatchManagement
    var m_dataSourceDosingBatchManagement = new kendo.data.DataSource({
        type: "odata-v4",
        transport: {
            read: {
              url: $("#gatewayPath").data("value") + "odata/ods/ZDosingBatchManagements?$expand=Material($select=_Key,MaterialLocalName,MaterialGlobalName)",
                datatype: 'json',
                beforeSend: function (x) {
                    var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                    x.setRequestHeader("Authorization", auth);
                },
                cache: false
            },
            update: {
                url: function (data) {
                  return $("#gatewayPath").data("value") + "odata/ods/ZDosingBatchManagements(" + data._Key + ")?$expand=Material($select=_Key,MaterialLocalName,MaterialGlobalName)";
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
                            '", "AlphaAcid": "' + data.AlphaAcid +
                              '", "BatchName": "' + data.BatchName +
                              '", "ValidSince": "' + kendoHelper.getUTCDate(new Date(data.ValidSince)) +
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
                        }
                    }
                    // Abfrageerstellung ausführen
                    var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
                    result.$count = true;
                    delete result.$inlinecount;

                    // Filteranpassungen nach Abfrageerstellung
                    if (result.$filter) {
                        result.$filter = result.$filter.replace(/ValidSince/g, "cast(ValidSince, Edm.DateTimeOffset)");
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
            if (!m_dataValuesInitialized || !m_dataSourceDosingBatchManagementInitialized) {
                e.preventDefault();

                // Datenquelle wurde initialisiert
                m_dataSourceDosingBatchManagementInitialized = true;

            }
        },
       
        schema: {
          model: {
            id: "_Key",
            fields: {
              "_Key": { type: "number" },
              "BatchName": { type: "string" },
              "Material": { field: "Material", type: "string", parse: function (value) { return value || {} } },
              "MaterialLocalName": { field: "Material.MaterialLocalName", type: "string" },
              "MaterialGlobalName": { field: "Material.MaterialGlobalName", type: "string" }, 
              "ValidSince":  {type: "date",parse: function (value) {return (value === undefined || value === null) ? null : value;}},
              "AlphaAcid": { type: "number", defaultValue: 0, parse: function (value) { return (value === undefined || value === null) ? 0 : value; } },
              "Comment": { type: "string", defaultValue: '' }, 
              "Command": { type: "string", parse: function (value) { return 0; }, editable: false },
              "_Kendo_SaveIt": { type: "number", defaultValue: 0, parse: function (value) { return 0; } }
            }
          }
        },
      
        batch: false,
        pageSize: 10,
        serverPaging: true,
        serverSorting: true,
        serverFiltering: true
    });

    // ----------------------------------------
    // Init
    $scope.OnInitDosingBatchManagement = function () {

        // Sortierung setzen
        kendoHelper.setDataSourceSorts(m_dataSourceDosingBatchManagement, "Material.MaterialLocalName", "desc");

        // Werte initialisiert
        m_dataValuesInitialized = true;

        // Datenquelle zuweisen
        $scope.gridDosingBatchManagement.dataSource = m_dataSourceDosingBatchManagement;

        // Datenquelle lesen
        $scope.gridDosingBatchManagement.dataSource.read();

      
    };



  // Optionen für Grid DosingBatchManagement
    $scope.gridDosingBatchManagement = {
        // toolbar: ["pdf", "excel"],       // disabled due to bug in kendo ui 2015 
        //pdf: {
        //    fileName: txt.TXT_SAP_INTERFACE + "-" + new Date() + ".pdf",
        //    title: txt.TXT_SAP_INTERFACE,
        //    creator: "Plant iT WebPortal",
        //    allPages: true,
        //    landscape: true,
        //    margin: {
        //        left: "10mm",
        //        right: "10mm",
        //        top: "10mm",
        //        bottom: "10mm"
        //    }
        //},
        //pdfExport: function (e) {
        //    m_pdfExportRunning = true;

        //    e.promise.done(function () {
        //        m_pdfExportRunning = false;

        //        // Daten des Grids neu laden
        //        $scope.OnGridBatchOverviewRefresh();
        //    });

        //},
        //excel: {
        //    fileName: txt.TXT_SAP_INTERFACE + "-" + new Date() + ".xlsx",
        //    allPages: true
        //},
        dataBound: function (e) {
            var actualDosingBatchManagementPage = $scope.gridDosingBatchManagement.pager.dataSource.page();
            // ToolTip
            $scope.gridDosingBatchManagement.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                $(this).attr('title', $(this).data('title'));
            })

            // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
            // dadurch entsteht Speicherverschmiss
            if (m_timeoutDosingBatchManagementHandle != null) {
                // ggf. laufenden Timeout stoppen
              clearTimeout(m_timeoutDosingBatchManagementHandle);

                // zurücksetzen
              m_timeoutDosingBatchManagementHandle = null;
            }

            if (m_timeoutDosingBatchManagementHandle == null) {

                // Timeout starten
              m_timeoutDosingBatchManagementHandle = setTimeout(function (grid) {

                    // Timeout abgelaufen
                m_timeoutDosingBatchManagementHandle = null;

                    // expandierten Zeilenzustand wiederherstellen
                    //if (m_expandedRows) {
                    //    for (var i = 0; i < grid.tbody.children().length; i++) {
                    //        var row = $(grid.tbody.children()[i]);
                    //        var uid = row.data("uid");

                    //        if (!!grid.dataSource && !!uid) {
                    //            var dataItemByUid = grid.dataSource.getByUid(row.data("uid"));

                    //            if (!!dataItemByUid) {

                    //                for (var j = 0; j < m_expandedRows.length; j++) {
                    //                    if (m_expandedRows[j] == dataItemByUid.id) {
                    //                        m_expandedRows[j] = 0;
                    //                        grid.expandRow(row);
                    //                    }
                    //                }
                    //            }

                    //            row = undefined;
                    //        }
                    //    }
                    //}

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
        filterable: false,

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
            var fieldName = this.thead.find("th").eq(columnIndex).data("field");

            if (EDITABLE_FIELDS_UPDATE_BM.indexOf(fieldName) < 0) this.closeCell();
        },
        save: function (e) {
          if (e.values != undefined) {

            if (e.values.AlphaAcid != undefined || e.values.BatchName != undefined) {
              e.model.ValidSince = new Date();
            }



            // soll etwas gespeichert werden?
            e.model._Kendo_SaveIt = 1;
          }
        },


        // columnMenu: true,
        columns: [ {
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
            field: "ValidSince",
            title: txt.TXT_VALIDSINCE,
            template: "#= kendo.toString(kendo.parseDate(ValidSince, 'yyyy-MM-dd'), 'dd-MM-yyyy') #",
            attributes: {
                style: "text-align: center;"
            }
           
        }, {
            field: "BatchName",
            title: txt.TXT_BATCH_NAME,
            attributes: {
                style: "text-align: center;"
            }
        }, {
            field: "AlphaAcid",
            title: txt.TXT_ALPHAACID,
            attributes: {
                style: "text-align: center;"
            },
            template: function (data) {
              
              return kendo.toString(data.AlphaAcid,"n2");
              
            },
            editor: function (container, options) {
              var input = $('<input data-text-field="AlphaAcid" data-value-field="AlphaAcid" data-bind="value:AlphaAcid"/>')
                input.appendTo(container);
                input.kendoNumericTextBox();
             
            },
        }, {
            field: "Comment",
            title: txt.TXT_COMMENT,
            attributes: {
                style: "text-align: center;"
            },
            //template: '<input type="checkbox" #= Comment ? "checked" : "" # disabled="false" ></input>',
            filterable: false
        }, ]
    };


  
    // Kommentaränderung
    $scope.OnCommentChange = function (dataItem, grid) {
        // Kommentaränderung im Grid 
        var item = grid.dataSource.get(dataItem._Key);

        // geänderten Wert setzen
        kendoHelper.setValue(dataItem, grid, 'Comment', item.Comment);

        // Änderungsbit setzen
        kendoHelper.setChangeBit(dataItem, grid, 'Comment');
        kendoHelper.setCheckBoxChange(dataItem, grid, 'Comment', item.Comment);
    };

    $scope.OnActionSaveFocus = function () {
        // Selektierte & expandierte Zeilen merken
      var grid = $scope.gridDosingBatchManagement;
        //m_expandedRows = undefined;
        //m_expandedRows = $.map(grid.tbody.find(":has(> .k-hierarchy-cell .k-minus)"), function (row) {
        //    if (!row) return false;

        //    if (!$(row)) return false;

        //    if ($(row).closest('[kendo-grid]').length <= 0) return false;

        //    if (!$(row).closest('[kendo-grid]').data("kendoGrid")) return false;

        //    if (!$(row).closest('[kendo-grid]').data("kendoGrid").dataSource) return false;

        //    var uid = $(row).data("uid");
        //    if (uid == undefined) return false;

        //    return $(row).closest('[kendo-grid]').data("kendoGrid").dataSource.getByUid(uid).id;
        //});
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
    $scope.OnGridDosingBatchManagementRefresh = function () {


        $scope.OnActionSaveFocus();

        // Init
        if (!m_dataValuesInitialized || !m_dataSourceDosingBatchManagementInitialized) return;

        // Request sperren
        m_dataValuesInitialized = false;
        // Request entsperren
        m_dataValuesInitialized = true;

        // Daten lesen  
        $scope.gridDosingBatchManagement.dataSource.read();
    };

    // Speichern
    $scope.OnGridDosingBatchManagementSave = function () {

        $scope.OnActionSaveFocus();

        // Ermittle Aktuelle Seite
        var actualDosingBatchManagementPage = $scope.gridDosingBatchManagement.pager.dataSource.page();

        // Daten zum speichern markieren (Header)
        var data = $scope.gridDosingBatchManagement._data;
        // Speichermarkierung für alle Werte setzen
        if (data) {
            for (i = 0; i < data.length; i++) {
                if (data[i].dirty) {
                    data[i]._Kendo_SaveIt = 1;
                };
            }
        }
        

        // Daten speichern (Header)
        $scope.gridDosingBatchManagement.dataSource.sync();

        // Seite wieder laden
        if (actualDosingBatchManagementPage > 1) {
            // wieder auf Seite zurückspringen
          $scope.gridDosingBatchManagement.pager.dataSource.page(actualDosingBatchManagementPage);
        }
    };
}]);