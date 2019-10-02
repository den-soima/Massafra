// App: KendoBrewPlan
var app = angular.module("KendoBrewPlan", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: BrewPlanCtrl
app.controller("BrewPlanCtrl", ['$scope', '$compile', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsEnumerationTexts', 'kendoOdsMaterials', 'refresh',
  function ($scope, $compile, ngDialog, txt, kendoHelper, kendoOdsEnumerationTexts, kendoOdsMaterials, refresh) {

    // Verweis auf Service
    $scope.srv_kendoOdsEnumerationTexts = kendoOdsEnumerationTexts;
    
    // Konstanten
    const TIMEINTERVAL_PER_DAY_MS = 86400000;
    const ENUM_STATUS_BREWPLAN = 'Status_BrewPlan';         // Text des Status
    const EDITABLE_FIELDS_UPDATE_BREWPLAN = ['StartTime', 'Quantity', 'UserParam1', 'UserParam2']; // als Array, welche Felder in BrewPlan bearbeitbar sind
    const STATUS_CANCELEDBYMES = [5, 6];         // als Array, Status welche von MES abgebrochen wurde
    const STATUS_VALIDATE = 0;
    const STATUS_READYFORPROCESSING = 1;
    const STATUS_SUCCESS = 2;
                  
    // interne Variablen                       
    var m_IsRefreshDelayDialogVisible = false;
                                       
    var m_pdfExportRunning = false;


    // -------------------------
    // Datenquelle des Grids: BrewPlan
    var m_dataSourceBrewPlan = new kendo.data.DataSource({
      type: "odata-v4",
      transport: {
        read: {
          url: $("#gatewayPath").data("value") + "odata/ods/ProcessProductionScheduleHeaders?$expand=Material($select=_Key,MaterialLocalName,MaterialGlobalName)&$select=_Key,ID,OrderType,ProductionResourceOrLine,MaterialLotID,StartTime,Quantity,UnitOfMeasure,UserParam1,UserParam2,UserParam3,CreationTime,Comment,Status",
          datatype: 'json',
          beforeSend: function (x) {
            var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
            x.setRequestHeader("Authorization", auth);
          }
        },
        update: {
          url: function (data) {
            return $("#gatewayPath").data("value") + "odata/ods/ProcessProductionScheduleHeaders(" + data._Key + ")?$expand=Material($select=_Key,MaterialLocalName,MaterialGlobalName)&$select=_Key,ID,OrderType,ProductionResourceOrLine,MaterialLotID,StartTime,Quantity,UnitOfMeasure,UserParam1,UserParam2,UserParam3,CreationTime,Comment,Status";
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
              return '{ "_Key": "' + data._Key +
                     '","StartTime": "' + kendoHelper.getDate(data.StartTime) +               //   +  
                     '","Quantity": "' + data.Quantity +
                     '","UserParam1": "' + data.UserParam1 +
                     '","UserParam2": "' + data.UserParam2 +
                     '","UserParam3": "' + ((data.UserParam3) ? 1 : 0) +
                     '","Comment": "' + data.Comment +
                     '","Status": "' + data.Status +
                     '"}';
            }
          }
          if (operation === "read") {
            var dataToRead = data;

            // Filteranpassungen vor Abfrageerstellung
            if (dataToRead.filter && dataToRead.filter.filters) {
              for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                if (!!dataToRead.filter.filters[i].field) {
                  if (dataToRead.filter.filters[i].field == "Status")
                    dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value);  // damit Nummer abgefragt wird        
                  else if (dataToRead.filter.filters[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() != "en")
                    dataToRead.filter.filters[i].field = "Material/MaterialLocalName";
                  else if (dataToRead.filter.filters[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() == "en")
                    dataToRead.filter.filters[i].field = "Material/MaterialGlobalName";
                }
                else if (dataToRead.filter.filters[i].logic == "or") {
                  for (var j = 0; j < dataToRead.filter.filters[i].filters.length; j++) {
                    if (dataToRead.filter.filters[i].filters[j].field == "Status") {
                      dataToRead.filter.filters[i].filters[j].value = parseInt(dataToRead.filter.filters[i].filters[j].value);  // damit Nummer abgefragt wird        
                    }
                  }
                }
              }
            }

            // Sortieranpassungen vor Abfrageerstellung
            if (!!dataToRead.sort) {
              for (var i = 0; i < dataToRead.sort.length; i++) {
                if (dataToRead.sort[i].field == "Material" && PCommonPortalMethods.GetSiteLanguage() != "en")
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
              result.$filter = result.$filter.replace(/CreationTime/g, "cast(CreationTime, Edm.DateTimeOffset)");
              result.$filter = result.$filter.replace(/StartTime/g, "cast(StartTime, Edm.DateTimeOffset)");
            }

            return result;
          }
        }
      },
      requestEnd: function (e) {
        var offsetMiliseconds = new Date().getTimezoneOffset() * 60000;

        if (e.response.value && e.response.value.length) {
          data = e.response.value;
          for (var i = 0; i < data.length; i++) {
            // Zeit einheitlich setzen            todo
            //    data[i].StartTime = kendoHelper.getDate(new Date(data[i].StartTime));
            //    data[i].CreationTime = kendoHelper.getDate(new Date(data[i].CreationTime));

          }
        }

      },
      schema: {
        model: {
          id: "_Key",
          fields: {
            "_Key": { type: "string" },
            "ID": { type: "string" },
            "OrderType": { type: "string", parse: function (value) { return (value === undefined) ? {} : value; } },
            "ProductionResourceOrLine": { type: "string" },
            "Material": { field: "Material", type: "string", parse: function (value) { return (value === undefined || value === null) ? {} : value; } },
            "MaterialLocalName": { field: "Material.MaterialLocalName", type: "string" },
            "MaterialGlobalName": { field: "Material.MaterialGlobalName", type: "string" } ,
            "MaterialLotID": { type: "string" },
            "StartTime": { type: "date" },
            "Quantity": { type: "number" },
            "UnitOfMeasure": { type: "string" },
            "UserParam1": { type: "number" },
            "UserParam2": { type: "number" },
            "UserParam3": { type: "boolean", parse: function (value) { return (value == "1") ? true : false; } },
            "CreationTime": { type: "date" },
            "Comment": { type: "string" },
            "Status": { type: "string" },      
            "Command": { type: "string", parse: function (value) { return 0; } },
            "Links": { type: "string", parse: function (value) { return ""; } },
            "_Kendo_SaveIt": { type: "number", parse: function (value) { return 0; } }
          }
        }
      },
      batch: false,
      pageSize: 10,
      serverPaging: true,
      serverSorting: true,
      serverFiltering: true
    });





    // interne Funktionen

    // Refresh events
    var f_OnAutomaticRefreshElapsed = function () {
      // Ermittle aktuelle Seite
      var actualBrewPlanPage = $scope.gridBrewPlan.pager.dataSource.page();

      // Nur wenn auf Seite 1 die Aktualisierung anstoßen
      if (!actualBrewPlanPage || actualBrewPlanPage == 1) {
        // aktualisieren
        $scope.OnBrewPlanRefresh();
      }
    };

    var f_OnAutomaticRefreshDelayElapsed = function () {
      // Dialog ist ab jetzt sichtbar
      if (m_IsRefreshDelayDialogVisible)
        return;
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
            if ($scope.checkBoxAutomaticRefreshValue == 1)
              refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
          }
            // Antwort: save and continue
          else if (data.value == 1) {
            refresh.StopAutomaticRefreshDelay();
            // speichern
            $scope.OnBrewPlanSave();

            // normale Aktualisierung
            if ($scope.checkBoxAutomaticRefreshValue == 1)
              refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
          }
            // Antwort: cancel and continue
          else if (data.value == 2) {
            refresh.StopAutomaticRefreshDelay();
            // speichern
            $scope.OnBrewPlanRefresh();
            // normale Aktualisierung
            if ($scope.checkBoxAutomaticRefreshValue == 1)
              refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
          }
        }
        finally {
          // Dialog wurde ausgeblendet
          m_IsRefreshDelayDialogVisible = false;
        }

      });
    };
            
    // ----------------------------------------
    // Init
    $scope.OnInitBrewPlan = function () {
      // Status initialisieren                                          
      kendoOdsEnumerationTexts.init(ENUM_STATUS_BREWPLAN);

      // Filter setzen
      kendoHelper.setDataSourceFilters(m_dataSourceBrewPlan, "CreationTime", "gte", $scope.dtBrewPlanStartValue);    // gte Kendo Operator
      kendoHelper.setDataSourceFilters(m_dataSourceBrewPlan, "CreationTime", "lte", $scope.dtBrewPlanStopValue);       // lte Kendo Operator
      kendoHelper.setDataSourceFilters(m_dataSourceBrewPlan, "Status", "neq", STATUS_SUCCESS);  // neq Kendo Operation,  <> Status 2  
      kendoHelper.setDataSourceFilters(m_dataSourceBrewPlan, "OrderType", "eq", "Z001");  // eq Kendo Operation, nur Sudaufträge
      // Sortierung setzen
      kendoHelper.setDataSourceSorts(m_dataSourceBrewPlan, "CreationTime", "desc");

      // Datenquelle zuweisen
      $scope.gridBrewPlan.dataSource = m_dataSourceBrewPlan;

      // Datenquelle lesen
      $scope.gridBrewPlan.dataSource.read();

      // Autorefresh starten
      $scope.OnCheckBoxAutomaticRefreshChange();


    };

    // ----------------------------------------
    // Checkbox für Automatische Aktualisierung
    $scope.checkBoxAutomaticRefreshValue = 1;

    // DateTimePicker für CreationTime                                              
    $scope.dtBrewPlanStopValue = new Date(new Date(new Date().getTime() + 7 * TIMEINTERVAL_PER_DAY_MS));
    $scope.dtBrewPlanStartValue = new Date(new Date(new Date().getTime() - 7 * TIMEINTERVAL_PER_DAY_MS));

    // ----------------------------------------
    // Änderungen an Datums/Zeitauswahl - CreationTime - Start
    $scope.dateTimePickerBrewPlanStart = {
      change: function () {
        $scope.OnBrewPlanRefresh();
      }
    };

    // Änderungen an Datums/Zeitauswahl - CreationTime - Stop
    $scope.dateTimePickerBrewPlanStop = {
      change: function () {
        $scope.OnBrewPlanRefresh();
      }
    };

    // Optionen für Grid BrewPlan
    $scope.gridBrewPlan = {
      // toolbar: ["pdf", "excel"],       // disabled due to bug in kendo ui 2015 
      pdf: {
        fileName: txt.TXT_BREWPLAN + "-" + new Date() + ".pdf",
        title: txt.TXT_BREWPLAN,
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

        e.promise
        .done(function () {
          m_pdfExportRunning = false;

          // Daten des Grids neu laden
          $scope.OnBrewPlanRefresh();
        });

      },
      excel: {
        fileName: txt.TXT_BREWPLAN + "-" + new Date() + ".xlsx",
        allPages: true
      },
      dataBound: function (e) {
        // ToolTip
        this.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
          $(this).attr('title', $(this).data('title'));
        })
      },
      scrollable: true,
      sortable: true,
      editable: true,          // damit update von datasource moeglich ist
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
        var columnIndex = this.cellIndex(e.container) + 1;
        var fieldName = this.thead.find("th").eq(columnIndex).data("field");
          if (EDITABLE_FIELDS_UPDATE_BREWPLAN.indexOf(fieldName) < 0 || e.model.Status != STATUS_READYFORPROCESSING || e.model.Status != STATUS_SUCCESS) {
            this.closeCell();
            return;
          }
          // Automatische Aktualisierung anhalten und Verzögerung starten
          if ($scope.checkBoxAutomaticRefreshValue == 1) {
            refresh.StopAutomaticRefresh();
            refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
          }
          else {
            refresh.StopAutomaticRefreshDelay();
          }
        },

        save: function (e) {
          if (e.values != undefined) {
            // soll etwas gespeichert werden?
            e.model._Kendo_SaveIt = 1;
          }
        },
      columns: [{
        field: "ID",
        title: txt.TXT_ID,
        width: "10%"
      }, {
        field: "ProductionResourceOrLine",
        title: txt.TXT_PRODUCTIONRESOURCEORLINE,
        width: "10%"
      }, {
        field: "Material",
        title: txt.TXT_MATERIAL,
        width: "10%",
        filterable: {
          ui: function (element) {
            kendoOdsMaterials.setFilterUi(element, undefined);
          }
        },
        template: function (data) {
          if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
            if (data.Material._Key != null) {
              return data.Material.MaterialGlobalName;
            }
            return '';
          }
          else {
            if (data.Material._Key != null) {
              return data.Material.MaterialLocalName;
            }
            return '';
          }
        }
      }, {
        field: "MaterialLotID",
        title: txt.TXT_MATERIAL_LOT_ID,
        width: "10%",
      }, {
        field: "StartTime",
        title: txt.TXT_START_TIME,
        width: "10%",
        template: "#= kendo.toString(kendo.parseDate(StartTime, 'yyyy-MM-dd'), 'dd-MM-yyyy, HH:mm') #",
        filterable: {
          ui: "datetimepicker"
        }         // Hier wird durch globale CreationTime Filter gefiltert
      }, {
        field: "Quantity",
        title: txt.TXT_VALUE,
        width: "10%",
        template: '#= kendo.toString(Quantity, "n3")#  #=UnitOfMeasure#',
        attributes: {
          style: "text-align:right;"
        },
        editor: kendoHelper.getEditorNumeric
      }, {
        field: "UserParam1",
        title: txt.TXT_NUMBER_OF_BREWS,
        width: "5%",
        attributes: {
          style: "text-align:right;"
        }
      }, {
        field: "UserParam2",
        title: txt.TXT_CALCULATED_AMOUNT,
        width: "10%",
        template: '#= kendo.toString(kendo.parseFloat(UserParam2), "n3")#  #=UnitOfMeasure#',
        attributes: {
          style: "text-align:right;"
        },
        editor: kendoHelper.getEditorNumeric
      }, {
        field: "UserParam3",
        title: txt.TXT_NEW_EXECUTION_SET,
        width: "5%",
        template: '<input type="checkbox" ng-model="dataItem.UserParam3" ng-change="OnCheckBoxNewExecutionSetChange(dataItem)"></input>',
        attributes: {
          style: "text-align:center;"
        },
        filterable: false
      }, {
        field: "CreationTime",
        title: txt.TXT_CREATION_TIME,
        width: "10%",
        template: "#= kendo.toString(kendo.parseDate(CreationTime, 'yyyy-MM-dd'), 'dd-MM-yyyy, HH:mm') #",
        filterable: false         // Hier wird durch globale CreationTime Filter gefiltert
      }, {
        field: "Comment",
        title: txt.TXT_COMMENT,
        width: "5%",
        attributes: {
          style: "text-align: center;"
        },
        template: '<input type="checkbox" #= Comment ? "checked" : "" # disabled="false" ></input>',
        filterable: false
      }, {
        field: "Status",
        title: txt.TXT_STATUS,
        width: "95px",
        template: function (dataItem) {
          // Text zur Nummer liefern
          return kendo.htmlEncode(kendoOdsEnumerationTexts.getText(dataItem.Status, ENUM_STATUS_BREWPLAN));
        },
        filterable: {
          multi: true,
          dataSource: kendoOdsEnumerationTexts.getDataSource(ENUM_STATUS_BREWPLAN),
          itemTemplate: function (e) {
            if (e.field == "all") {
              //handle the check-all checkbox template
              return "<div><label><strong><input type='checkbox' />#= all#</strong></label></div><br />";
            } else {
              //handle the other checkboxes
              return "<span><label><input type='checkbox' name='" + e.field + "' value='#=TextNumber#'/>&nbsp;<span>#= angular.element(\'\\#BrewPlanCtrl\').scope().srv_kendoOdsEnumerationTexts.getText(data.TextNumber, \'" + ENUM_STATUS_BREWPLAN + "\')  #</span></label></span><br />"
            }
          }
        }
      }, {
        field: "Command",
        title: " ",
        width: "10%",
        attributes: {
          style: "text-align: center;"
        },
        template: function (data) {
          if (STATUS_CANCELEDBYMES.indexOf(data.Status) >= 0) {
            return "";
          }
          else {
            var retValue = '';
            if (data.Status === STATUS_VALIDATE)
              retValue += '<button class="reset" ng-click="OnChangeStateBrewPlan($event)"> ' + txt.TXT_SEND_TO_PCS + ' </button>' 
            else
              retValue += '<button class="reset" ng-click="OnChangeStateBrewPlan($event)"> ' + txt.TXT_RESET + ' </button>'
            return retValue;
          }
        },
        filterable: false
      }, {
        field: "Links",
        title: txt.TXT_LINKS,
        width: "60px",
        type: "string",
        attributes: {
          style: "text-align: center;"
        },
        template: function (dataItem) {
          // Header Status ermitteln
          var sTemplate = ""
          sTemplate += '<a href="ProcessProductionPerformance?select_type=_ProdSchedHeaderKey&select_key=' + dataItem._Key + '" target="_blank"> ' + txt.TXT_PPP + ' </a>';
          // Template erzeugen
          return sTemplate;
        },
        filterable: false
      }]


    };



    // Benutzeraktionen 
    // Statusänderung  
    $scope.OnChangeStateBrewPlan = function (e) {
      if (!e || !e.target)
        return;

      if (!this.dataItem)
        return;

      // Datenzeile ermitteln
      var row = $(e.target).closest("tr");

      if (!row)
        return;

      // Daten & Grid ermitteln
      var data = this.dataItem;
      var _Key = data._Key;
      var grid = row.closest("div[kendo-grid]").data("kendoGrid");

      if (!grid)
        return;

      // Bei Löschung von MES ignorieren
      if (STATUS_CANCELEDBYMES.indexOf(data.Status) >= 0)
        return;

      // Validieren
      if (data.Status == STATUS_VALIDATE)
        kendoHelper.setValue(data, grid, 'Status', STATUS_READYFORPROCESSING);
        // Rücksetzen
      else
        kendoHelper.setValue(data, grid, 'Status', STATUS_VALIDATE);

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

    // Checkboxänderung - NewExecutionSet
    $scope.OnCheckBoxNewExecutionSetChange = function (dataItem) {
      // Grid ermitteln
      var masterRow = $scope.gridBrewPlan.tbody.find('tr[data-uid="' + dataItem.uid + '"]')

      if (!masterRow)
        return;

      var grid = masterRow.closest('div[kendo-grid]').data("kendoGrid");

      if (!grid)
        return;

      // Änderung im Grid   
      var item = grid.dataSource.get(dataItem._Key);

      // Detailzeile ermitteln
      var detailHeaderRow = grid.tbody.closest("tr.k-detail-row");

      // passende Kopfzeile ermitteln
      var dataHeaderItem = $scope.gridBrewPlan.dataItem(detailHeaderRow.prev());

      // falls nicht bearbeitbar?
      if (item.Status == STATUS_READYFORPROCESSING || item.Status == STATUS_SUCCESS || STATUS_CANCELEDBYMES.indexOf(item.Status) >= 0) {
        // geänderten Wert setzen
        kendoHelper.setValue(dataItem, grid, 'UserParam3', !item.UserParam3);
        return; // und abbrechen
      }

      // geänderten Wert setzen
      kendoHelper.setValue(dataItem, grid, 'UserParam3', item.UserParam3);

      // Änderungsbit setzen
      kendoHelper.setChangeBit(dataItem, grid, 'UserParam3');
      kendoHelper.setCheckBoxChange(dataItem, grid, 'UserParam3', item.UserParam3);

      // Automatische Aktualisierung anhalten und Verzögerung starten
      if ($scope.checkBoxAutomaticRefreshValue == 1) {
        refresh.StopAutomaticRefresh();
        refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
      }
    }

    // Refresh/Cancel
    $scope.OnBrewPlanRefresh = function () {
      // Filter setzen
      kendoHelper.setDataSourceFilters($scope.gridBrewPlan.dataSource, "CreationTime", "gte", $scope.dtBrewPlanStartValue);    // gte Kendo Operator
      kendoHelper.setDataSourceFilters($scope.gridBrewPlan.dataSource, "CreationTime", "lte", $scope.dtBrewPlanStopValue);       // lte Kendo Operator
      kendoHelper.setDataSourceFilters($scope.gridBrewPlan.dataSource, "OrderType", "eq", "Z001");  // eq Kendo Operation, nur Sudaufträge

      // Daten lesen  
      $scope.gridBrewPlan.dataSource.read();

      // Refreshhandling
      refresh.StopAutomaticRefreshDelay();
      refresh.StopAutomaticRefresh();
      if ($scope.checkBoxAutomaticRefreshValue == 1) {
        refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
      }
    };

    // Speichern
    $scope.OnBrewPlanSave = function () {
      // Ermittle Aktuelle Seite
      var actualBrewPlanPage = $scope.gridBrewPlan.pager.dataSource.page();

      // Daten zum speichern markieren  
      var data = $scope.gridBrewPlan._data;
      // Speichermarkierung für alle Werte setzen
      if (data) {
        for (i = 0; i < data.length; i++) {
          if (data[i].dirty) {
            data[i]._Kendo_SaveIt = 1;
          };
        }
      }

      // Daten speichern  
      $scope.gridBrewPlan.dataSource.sync();



      // Seite wieder laden
      if (actualBrewPlanPage > 1) {

        // wieder auf Seite zurückspringen
        $scope.gridBrewPlan.pager.dataSource.page(actualBrewPlanPage);
      }

      // Refreshhandling
      refresh.StopAutomaticRefreshDelay();
      refresh.StopAutomaticRefresh();
      if ($scope.checkBoxAutomaticRefreshValue == 1) {
        refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
      }
    };

  }
]);