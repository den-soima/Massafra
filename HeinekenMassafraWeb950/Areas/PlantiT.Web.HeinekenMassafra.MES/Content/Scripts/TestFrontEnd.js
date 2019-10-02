// App: KendoTestFrontEnd
var app = angular.module("KendoTestFrontEnd", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: TestFrontEndCtrl
app.controller("TestFrontEndCtrl", ['$scope', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsEnumerationTexts', 'refresh',
  function ($scope, ngDialog, txt, kendoHelper, kendoOdsEnumerationTexts, refresh) {

      // Verweis auf Service      
      $scope.srv_kendoOdsEnumerationTexts = kendoOdsEnumerationTexts;

      // Konstanten
      const TIMEINTERVAL_PER_DAY_MS = 86400000;
      const ENUM_STATUS_HEADER = 'Status_TestFrontEndValues';         // Text des Status in Headerspalte
      const EDITABLE_FIELDS_UPDATE_BOH = ['ProcessStartTime']; // als Array, welche Felder in TestFrontEndHeader bearbeitbar sind
      const EDITABLE_FIELDS_UPDATE_BOV = ['Value', 'ValueString'];        // als Array, welche Felder in TestFrontEndValues bearbeitbar sind

      const STATUS_BOH_WAITING = 0;
      const STATUS_BOH_READYFORSEND = 1;
      const STATUS_BOH_ERROR = 4;
      const STATUS_BOH_MANUAL_OK = 5;

      const TIMEOUT_DELAY_DATABOUND = 500;  // notwendig um doppeltes Aufrufen zu vermeiden


      var m_dataValuesInitialized = false;
      var m_dataSourceTestFrontEndInitialized = false;


      // Aktualisieren des Treeview      
      var m_expandedRows = undefined;
      var m_selectedRows = undefined;

      var m_timeoutTestFrontEndHeaderHandle = null;
      var m_timeoutTestFrontEndValueHandle = new Array();


      // Struktur: dataSourceElement 
      function c_dataSourceElement(dataItem, dataSource) {
          this.dataItem = dataItem;
          this.dataSource = dataSource;
      };


      // interne Variablen                       
      var m_IsRefreshDelayDialogVisible = false;
      var m_dataSourceTestFrontEndValuesElements = new Array();  // Array mit allen datasource Elementen die in Grid TestFrontEndValues bereits gelesen wurden

      var m_selectedtabStripTestFrontEndHeaders = [];

      var m_pdfExportRunning = false;


      // -------------------------
      // Datenquelle des Grids: TestFrontEndHeader
      var m_dataSourceTestFrontEndHeaders = new kendo.data.DataSource({
          type: "odata-v4",
          transport: {
              read: {
                  url: $("#gatewayPath").data("value") + "odata/ods/ZWebBatchOverviews?$select=_Key,ProcessStartTime,CurrentStep,BatchName,MaterialLocalName,MaterialGlobalName,Comment,SAP_PO,SAP_Batch",
                  datatype: 'json',
                  beforeSend: function (x) {
                      var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                      x.setRequestHeader("Authorization", auth);
                  }
              },
              update: {
                  url: function (data) {
                      return $("#gatewayPath").data("value") + "odata/ods/ZWebBatchOverviews(" + data._Key + ")?$select=_Key,Comment,ProcessStartTime";
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
                              '","ProcessStartTime": "' + kendoHelper.getUTCDate(new Date(data.ProcessStartTime)) +
                                '"}';
                      }
                  }
                  if (operation === "read") {
                      var dataToRead = data;
                                            
                      // Filteranpassungen vor Abfrageerstellung
                      if (dataToRead.filter && dataToRead.filter.filters) {
                          for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                              if (dataToRead.filter.filters[i].field == "CurrentStep")
                                  dataToRead.filter.filters[i].field = "CurrentStep";
                              else if (dataToRead.filter.filters[i].field == "MaterialLocalName")
                                  dataToRead.filter.filters[i].field = "MaterialLocalName";
                              else if (dataToRead.filter.filters[i].field == "MaterialGlobalName")
                                  dataToRead.filter.filters[i].field = "MaterialGlobalName";
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

              if (!view)
                  return;

              var dataItem = view[0];

              if (!dataItem)
                  return;

          },
          requestStart: function (e) {
              // Wenn noch nicht initialisiert, abbruch
              if (!m_dataValuesInitialized || !m_dataSourceTestFrontEndInitialized) {
                  e.preventDefault();

                  // Datenquelle wurde initialisiert
                  m_dataSourceTestFrontEndInitialized = true;

              }
          },
          schema: {
              model: {
                  id: "_Key",
                  fields: {
                      "_Key": { type: "string" },
                      "ProcessStartTime": { type: "date" },
                      "CurrentStep": { type: "string" },
                      "BatchName": { type: "string" },
                      "MaterialLocalName": { type: "string" },
                      "MaterialGlobalName": { type: "string" },
                      "Comment": { type: "string", defaultValue: '' },
                      "SAP_PO": { type: "string" }, 
                      "SAP_Batch": { type: "string" },
                      "_Kendo_SaveIt": { type: "number", parse: function (value) { return 0; } },
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
      // Datenquelle des Grids: TestFrontEndValues (Hilfsfunktion)
      // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
      var f_GetDataSourceTestFrontEndValues = function (dataItem) {
          if (!m_dataSourceTestFrontEndValuesElements)
              m_dataSourceTestFrontEndValuesElements = new Array();
          // wenn gefunden, entsprechendes Element zurückgeben
          for (var i = 0; i < m_dataSourceTestFrontEndValuesElements.length; i++) {
              if (m_dataSourceTestFrontEndValuesElements[i].dataItem._Key == dataItem._Key)
                  return m_dataSourceTestFrontEndValuesElements[i].dataSource;
          }
          // Element anlegen
          var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceTestFrontEndValuesElement());

          // Filter/Sortierung setzen
          kendoHelper.setDataSourceFilters(newElement.dataSource, "_BatchKey", "eq", parseInt(dataItem._Key));


          // Element hinzufügen
          m_dataSourceTestFrontEndValuesElements.push(newElement);
          return newElement.dataSource;
      };

      // Datenquelle des Grids: TestFrontEndValues 
      var f_GetDataSourceTestFrontEndValuesElement = function () {
          var ds = {
              type: "odata-v4",
              transport: {
                  read: {
                      url: $("#gatewayPath").data("value") + "odata/ods/ZWebBatchOverviewValues?$select=_Key,_BatchKey,_UnitKey,UnitGlobalName,RecordingTime,UnitOfMeasurement,Value,ValueString,ValueCategoryLocalName,ValueCategoryGlobalName,ValueOriginal,ValueStringOriginal,LowerLimit,LowerVetoLimit,UpperLimit,UpperVetoLimit,Comment,Format",
                      datatype: 'json',
                      beforeSend: function (xhr) {
                          var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                          xhr.setRequestHeader("Authorization", auth);
                      }
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
                              return '{ "_Key": "' + data._Key +
                                      '", "Comment": "' + data.Comment +
                                      '","Value": ' + ((data.Value == null || data.Value == " ") ? null : '"' + data.Value + '"') +
                                      ',"ValueString": ' + ((data.ValueString == null || data.ValueString == "") ? null : '"' + data.ValueString + '"') +
                                      '}';
                          }
                      }
                      if (operation === "read") {
                          var dataToRead = data;

                          // Filteranpassungen vor Abfrageerstellung
                          if (dataToRead.filter && dataToRead.filter.filters) {
                              for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                                  if (!!dataToRead.filter.filters[i].field) {
                                  if (dataToRead.filter.filters[i].field == "LowerLimit")
                                      dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value);  // damit Nummer abgefragt wird        
                                  if (dataToRead.filter.filters[i].field == "UpperLimit")
                                      dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value);  // damit Nummer abgefragt wird        
                                  if (dataToRead.filter.filters[i].field == "LowerVetoLimit")
                                      dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value);  // damit Nummer abgefragt wird        
                                  if (dataToRead.filter.filters[i].field == "UpperVetoLimit")
                                      dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value);  // damit Nummer abgefragt wird        
                                  if (dataToRead.filter.filters[i].field == "ValueOriginal")
                                      dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value);  // damit Nummer abgefragt wird        
                                  if (dataToRead.filter.filters[i].field == "ValueStringOriginal")
                                      dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value);  // damit Nummer abgefragt wird        
                                  if (dataToRead.filter.filters[i].field == "Value")
                                      dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value);  // damit Nummer abgefragt wird        
                                  if (dataToRead.filter.filters[i].field == "ValueString")
                                      dataToRead.filter.filters[i].field = "ValueString";
                                  if (dataToRead.filter.filters[i].field == "ValueName" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                      dataToRead.filter.filters[i].field = "ValueCategoryLocalName";
                                  if (dataToRead.filter.filters[i].field == "ValueName" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                      dataToRead.filter.filters[i].field = "ValueCategoryGlobalName";
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
   
              group: {
                  field: ""
              }
          };


          if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
              ds.group.field = "UnitGlobalName";
          }
          else {
              ds.group.field = "UnitLocalName";
          }
          ds = new kendo.data.DataSource(ds);
          return ds;

   
      };

      // interne Funktionen

      // Refresh events
      var f_OnAutomaticRefreshElapsed = function () {
          // Ermittle aktuelle Seite
          var actualTestFrontEndHeadersPage = $scope.gridTestFrontEndHeaders.pager.dataSource.page();

          // Nur wenn auf Seite 1 die Aktualisierung anstoßen
          if (!actualTestFrontEndHeadersPage || actualTestFrontEndHeadersPage == 1) {
              // aktualisieren
              $scope.OnGridTestFrontEndRefresh();
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
                      $scope.OnGridTestFrontEndSave();

                      // normale Aktualisierung
                      if ($scope.checkBoxAutomaticRefreshValue == 1)
                          refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
                  }
                      // Antwort: cancel and continue
                  else if (data.value == 2) {
                      refresh.StopAutomaticRefreshDelay();
                      // speichern
                      $scope.OnGridTestFrontEndRefresh();
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



      var f_OnAutomaticRefreshDelayElapsedPage = function () {
          // Dialog ist ab jetzt sichtbar
          if (m_IsRefreshDelayDialogVisible)
              return;
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
                      if ($scope.checkBoxAutomaticRefreshValue == 1)
                          refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
                  }                 
                      // Antwort: cancel and continue
                  else if (data.value == 2) {
                      refresh.StopAutomaticRefreshDelay();
                      // speichern
                      $scope.OnGridTestFrontEndRefresh();
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
      $scope.OnInitTestFrontEndHeaders = function () {


          // Status Initialisieren                                          
          kendoOdsEnumerationTexts.init(ENUM_STATUS_HEADER); 

          // Filter setzen
          kendoHelper.setDataSourceFilters(m_dataSourceTestFrontEndHeaders, "ProcessStartTime", "gte", $scope.dtTestFrontEndHeadersStartValue);    // gte Kendo Operator
          kendoHelper.setDataSourceFilters(m_dataSourceTestFrontEndHeaders, "ProcessStartTime", "lte", $scope.dtTestFrontEndHeadersStopValue);       // lte Kendo Operator


          // Sortierung setzen
          kendoHelper.setDataSourceSorts(m_dataSourceTestFrontEndHeaders, "ProcessStartTime", "desc");




          // Werte initialisiert
          m_dataValuesInitialized = true;

          // Datenquelle zuweisen
          $scope.gridTestFrontEndHeaders.dataSource = m_dataSourceTestFrontEndHeaders;

          // Datenquelle lesen
          $scope.gridTestFrontEndHeaders.dataSource.read();

          // Autorefresh starten
          $scope.OnCheckBoxAutomaticRefreshChange();
      };

      // ----------------------------------------
      // Checkbox für Automatische Aktualisierung
      $scope.checkBoxAutomaticRefreshValue = 1;

      // DateTimePicker für StartTime                                              
      $scope.dtTestFrontEndHeadersStopValue = new Date(new Date(new Date().getTime() + 7 * TIMEINTERVAL_PER_DAY_MS));
      $scope.dtTestFrontEndHeadersStartValue = new Date(new Date(new Date().getTime() - 7 * TIMEINTERVAL_PER_DAY_MS));



      // ----------------------------------------
      // Änderungen an Datums/Zeitauswahl - StartTime - Start
      $scope.dateTimePickerTestFrontEndHeadersStart = {
          change: function () {
              $scope.OnGridTestFrontEndRefresh();
          }
      };

      // Änderungen an Datums/Zeitauswahl - StartTime - Stop
      $scope.dateTimePickerTestFrontEndHeadersStop = {
          change: function () {
              $scope.OnGridTestFrontEndRefresh();
          }
      };


      // Optionen für Grid TestFrontEndHeader
      $scope.gridTestFrontEndHeaders = {
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

              e.promise
              .done(function () {
                  m_pdfExportRunning = false;

                  // Daten des Grids neu laden
                  $scope.OnGridTestFrontEndRefresh();
              });

          },
          excel: {
              fileName: txt.TXT_SAP_INTERFACE + "-" + new Date() + ".xlsx",
              allPages: true
          },
          dataBound: function (e) {
              var actualTestFrontEndHeadersPage = $scope.gridTestFrontEndHeaders.pager.dataSource.page();

              // Seite wieder laden
              if (actualTestFrontEndHeadersPage > 1 && $scope.checkBoxAutomaticRefreshValue == 1) {
                  refresh.StopAutomaticRefresh();
                  refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsedPage);
              }

              // Einfärben
              var gridData = this.dataSource.view();

              for (var i = 0; i < gridData.length; i++) {
                  // Wenn der Wert nicht bekannt ist, ignorieren
                  if (gridData[i].StatusPO === undefined || gridData[i].StatusPP === undefined || gridData[i].StatusQM === undefined)
                      continue;

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
              $scope.gridTestFrontEndHeaders.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                  $(this).attr('title', $(this).data('title'));
              })

              // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
              // dadurch entsteht Speicherverschmiss
              if (m_timeoutTestFrontEndHeaderHandle != null) {
                  // ggf. laufenden Timeout stoppen
                  clearTimeout(m_timeoutTestFrontEndHeaderHandle);

                  // zurücksetzen
                  m_timeoutTestFrontEndHeaderHandle = null;
              }

              if (m_timeoutTestFrontEndHeaderHandle == null) {

                  // Timeout starten
                  m_timeoutTestFrontEndHeaderHandle = setTimeout(function (grid) {

                      // Timeout abgelaufen
                      m_timeoutTestFrontEndHeaderHandle = null;

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

                                      if (!!selectedRow)
                                          break;
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
              
              // bearbeitbar?              
              var columnIndex = this.cellIndex(e.container);
              var fieldName = this.thead.find("th").eq(columnIndex + 1).data("field");

              if (EDITABLE_FIELDS_UPDATE_BOH.indexOf(fieldName) < 0)
                  this.closeCell();

              // Automatische Aktualisierung anhalten und Verzögerung starten
              if ($scope.checkBoxAutomaticRefreshValue == 1 && EDITABLE_FIELDS_UPDATE_BOH.indexOf(fieldName) >= 0) {
                  refresh.StopAutomaticRefresh();
                  refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
              }
          },
          columnMenu: true,
          columns: [
          {
              field: "BatchName",
              title: txt.TXT_BATCH_NAME,
          }, {
              field: "ProcessStartTime",
              title: txt.TXT_PROCESS_START_TIME,
              editor: kendoHelper.getEditorDateTime,
              template: "#= kendo.toString(kendo.parseDate(ProcessStartTime, 'yyyy-MM-dd'), 'dd-MM-yyyy, HH:mm') #",
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
                  }
                  else {
                      if (data.MaterialLocalName != null) {
                          return data.MaterialLocalName;
                      }
                      return '';
                  }
              }
          },{
              field: "CurrentStep",
              title: txt.TXT_STATUS,
              attributes: {
                  style: "text-align: center;"
              },
              template: function (data) {
                  if (data.CurrentStep != null && data.CurrentStep != 'null') {
                      return data.CurrentStep;
                  }
                  else {
                      return ' ';
                  }
              },
          }, {
              field: "SAP_PO",
              title: txt.TXT_SAP_PO,
              attributes: {
                  style: "text-align: center;"
              },
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
          }]
      };


      // Optionen für Grid TestFrontEndValues        
      $scope.gridTestFrontEndValues = function (dataItem) {
          return {
              dataSource: f_GetDataSourceTestFrontEndValues(dataItem),
              dataBound: function (e) {
                                
                  this.pager.element.hide();

                  collapseAllGroups(this);

                  // Einfärben
                  var headerCells = this.thead.find("th");
                  var gridData = this.dataSource.data();

                  for (var i = 0; i < gridData.length; i++) {
                      // Wenn der Wert nicht bekannt ist, ignorieren
                      if (gridData[i].Value === undefined)
                          continue;

                      if (gridData[i].Value == 0)
                          gridData[i].Value = undefined

                      var bLimitViolation = false
                      var bLimitVetoViolation = false

                      for (var j = 0; j < headerCells.length; j++) {

                          // Untergrenze
                          if (headerCells.eq(j).data("field") == "LowerLimit") {
                              if (gridData[i].LowerLimit === undefined)
                                  continue;


                              if (gridData[i].Value < gridData[i].LowerLimit) {
                                  bLimitViolation = true;
                                  $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                              }
                          }
                          // Obergrenze
                          if (headerCells.eq(j).data("field") == "UpperLimit") {
                              if (gridData[i].UpperLimit === undefined)
                                  continue;

                              if (gridData[i].Value > gridData[i].UpperLimit) {
                                  bLimitViolation = true;
                                  $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                              }
                          }
                          // Untergrenze (Plus)
                          if (headerCells.eq(j).data("field") == "LowerVetoLimit") {
                              if (gridData[i].LowerVetoLimit === undefined)
                                  continue;

                              if (gridData[i].Value < gridData[i].LowerVetoLimit) {
                                  bLimitVetoViolation = true;
                                  $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                              }
                          }
                          // Obergrenze (Plus)
                          if (headerCells.eq(j).data("field") == "UpperVetoLimit") {
                              if (gridData[i].UpperVetoLimit === undefined)
                                  continue;

                              if (gridData[i].Value > gridData[i].UpperVetoLimit) {
                                  bLimitVetoViolation = true;
                                  $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                              }
                          }
                      }

                      if (bLimitViolation || bLimitVetoViolation) {
                          for (var j = 0; j < headerCells.length; j++) {
                              // Untergrenze
                              if (headerCells.eq(j).data("field") == "Value") {
                                  if (bLimitVetoViolation) {
                                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpecVeto");
                                      break;
                                  }
                                  else if (bLimitViolation) {
                                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                                      break;
                                  }
                              }
                          }
                      }
                  }

                  // ToolTip
                  $scope.gridTestFrontEndHeaders.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
                      $(this).attr('title', $(this).data('title'));
                  })

                  // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                  // dadurch entsteht Speicherverschmiss
                  if (m_timeoutTestFrontEndValueHandle[dataItem.id] != null) {
                      // ggf. laufenden Timeout stoppen
                      clearTimeout(m_timeoutTestFrontEndValueHandle[dataItem.id]);

                      // zurücksetzen
                      m_timeoutTestFrontEndValueHandle[dataItem.id] = null;
                  }

                  if (m_timeoutTestFrontEndValueHandle[dataItem.id] == null) {

                      // Timeout starten
                      m_timeoutTestFrontEndValueHandle[dataItem.id] = setTimeout(function (grid) {

                          // Timeout abgelaufen
                          m_timeoutTestFrontEndValueHandle[dataItem.id] = null;

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

                                          if (!!selectedRow)
                                              break;
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
              scrollable: true,
              sortable: true,
              editable: true,      // damit update von datasource moeglich ist
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
                  var dataHeaderItem = $scope.gridTestFrontEndHeaders.dataItem(detailHeaderRow.prev());

                  // bearbeitbar? 
                  if (EDITABLE_FIELDS_UPDATE_BOV.indexOf(fieldName) < 0)
                      this.closeCell();
                  else
                      var gridData = this.dataSource.data();
                  for (var i = 0; i < gridData.length; i++) {
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass("gridCellOutOfSpec") +
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass("gridCellOutOfSpecVeto");
                  }               

                  for (var i = 0; i < gridData.length; i++) {

                      if (gridData[i].Value == undefined)
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass() +
                         $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[8]).removeClass() +
                         $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass() +
                         $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[8]).removeClass() +
                         $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[7]).removeClass() +
                         $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[9]).removeClass() +
                         $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[10]).removeClass();

                      else if ((gridData[i].Value > gridData[i].UpperLimit) && (gridData[i].Value < gridData[i].UpperVetoLimit) || gridData[i].Value == gridData[i].UpperLimit)
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).addClass("gridCellOutOfSpec") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[8]).addClass("gridCellOutOfSpec") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass("gridCellOutOfSpecVeto") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[8]).removeClass("gridCellOutOfSpecVeto") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[7]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[9]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[10]).removeClass();

                      else if (gridData[i].Value > gridData[i].UpperVetoLimit || gridData[i].Value == gridData[i].UpperVetoLimit)
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).addClass("gridCellOutOfSpecVeto") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[10]).addClass("gridCellOutOfSpecVeto") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass("gridCellOutOfSpec") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[10]).removeClass("gridCellOutOfSpec") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[8]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[7]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[9]).removeClass();

                      else if ((gridData[i].Value < gridData[i].LowerLimit) && (gridData[i].Value > gridData[i].LowerVetoLimit) || gridData[i].Value == gridData[i].LowerLimit)
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).addClass("gridCellOutOfSpec") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[7]).addClass("gridCellOutOfSpec") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass("gridCellOutOfSpecVeto") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[7]).removeClass("gridCellOutOfSpecVeto") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[8]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[9]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[10]).removeClass();

                      else if (gridData[i].Value < gridData[i].LowerVetoLimit || gridData[i].Value == gridData[i].LowerVetoLimit)
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).addClass("gridCellOutOfSpecVeto") +
                             $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[9]).addClass("gridCellOutOfSpecVeto") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass("gridCellOutOfSpec") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[9]).removeClass("gridCellOutOfSpec") +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[7]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[8]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[10]).removeClass();

                      else if (gridData[i].Value > gridData[i].LowerLimit && gridData[i].Value < gridData[i].UpperLimit)
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[3]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[9]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[7]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[8]).removeClass() +
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[10]).removeClass();

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
                  width: "24%",
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
                  editor: ValueEditor,
                  template: function (data) {
                      if (data.ValueString == null || data.ValueString == '') {
                          return (!data.Value) ? "" : kendo.toString(data.Value, ((!data.Format) ? 0 : data.Format));
                      }
                      else {
                          return data.ValueString;
                      }            
                  },
                  attributes: {
                      style: "text-align: right;"
                  },
              },
              {
                  field: "UnitOfMeasurement",
                  title: txt.TXT_UNIT_OF_MEASUREMENT,
                  width: "9%",
                  filterable: false
              }, {
                  field: "RecordingTime",
                  title: txt.TXT_RECORDING_TIME,
                  width: "14%",
                  template: "#= kendo.toString(kendo.parseDate(RecordingTime, 'yyyy-MM-dd'), 'dd-MM-yyyy, HH:mm') #",
                  attributes: {
                      style: "text-align: center;"
                  },
              }, {
                  field: "ValueOriginal",
                  title: txt.TXT_VALUE_ORIGINAL,
                  width: "9%",
                  template: function (data) {
                      if (data.ValueStringOriginal == null || data.ValueStringOriginal == '') {
                          return (!data.ValueOriginal) ? "" : kendo.toString(data.ValueOriginal, ((!data.Format) ? 0 : data.Format));
                      }
                      return data.ValueStringOriginal;
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
                      return (!data.LowerLimit) ? "" : kendo.toString(data.LowerLimit, ((!data.Format) ? 0 : data.Format));
                  },
              }, {
                  field: "UpperLimit",
                  title: txt.TXT_UPPER_LIMIT,
                  width: "9%",
                  attributes: {
                      style: "text-align:right;"
                  },
                  template: function (data) {
                      return (!data.UpperLimit) ? "" : kendo.toString(data.UpperLimit, ((!data.Format) ? 0 : data.Format));
                  },
              }, {
                  field: "LowerVetoLimit",
                  title: txt.TXT_LOWER_LIMIT_PLUS,
                  width: "9%",
                  attributes: {
                      style: "text-align:right;"
                  },
                  template: function (data) {
                      return (!data.UpperLimit) ? "" : kendo.toString(data.LowerVetoLimit, ((!data.Format) ? 0 : data.Format));
                  },
              }, {
                  field: "UpperVetoLimit",
                  title: txt.TXT_UPPER_LIMIT_PLUS,
                  width: "9%",
                  attributes: {
                      style: "text-align:right;"
                  },
                  template: function (data) {
                      return (!data.UpperVetoLimit) ? "" : kendo.toString(data.UpperVetoLimit, ((!data.Format) ? 0 : data.Format));
                  },
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

     var collapseAllGroups = function (grid) {
          grid.table.find(".k-grouping-row").each(function () {
              grid.collapseGroup(this);
          });
      }

      function ValueEditor(container, options) {
          if (options.model.Value) {
              var input = $('<input required data-text-field="Value" data-value-field="Value" data-bind="value:Value"/>')
              input.appendTo(container);
              input.kendoNumericTextBox({
                  min: 0
              });                            
          }
          else {
              var input = $('<input type="text" class="k-input k-textbox" name="ValueString" data-bind="value:ValueString">');
              input.appendTo(container);
          }
      }

      // Benutzeraktionen

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
          var grid = $scope.gridTestFrontEndHeaders;
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
      $scope.OnGridTestFrontEndRefresh = function () {


          $scope.OnActionSaveFocus();

          // Init
          if (!m_dataValuesInitialized || !m_dataSourceTestFrontEndInitialized) return;

          // Request sperren
          m_dataValuesInitialized = false;

          // Filter setzen
          kendoHelper.setDataSourceFilters(m_dataSourceTestFrontEndHeaders, "ProcessStartTime", "gte", $scope.dtTestFrontEndHeadersStartValue); // gte Kendo Operator
          kendoHelper.setDataSourceFilters(m_dataSourceTestFrontEndHeaders, "ProcessStartTime", "lte", $scope.dtTestFrontEndHeadersStopValue); // lte Kendo Operator

          // Request entsperren
          m_dataValuesInitialized = true;

          // Daten lesen  
          $scope.gridTestFrontEndHeaders.dataSource.read();     

          // Refreshhandling
          refresh.StopAutomaticRefreshDelay();
          refresh.StopAutomaticRefresh();
          if ($scope.checkBoxAutomaticRefreshValue == 1) {
              refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
          }
      };

      // Speichern
      $scope.OnGridTestFrontEndSave = function () {

          $scope.OnActionSaveFocus();

          // Ermittle Aktuelle Seite
          var actualTestFrontEndHeadersPage = $scope.gridTestFrontEndHeaders.pager.dataSource.page();

          // Daten zum speichern markieren (Header)
          var data = $scope.gridTestFrontEndHeaders._data;
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
                  // Daten zum speichern markieren (Detail)
                  if ($scope.gridTestFrontEndValues) {
                      var dataValues = f_GetDataSourceTestFrontEndValues(data[i])._data;
                      for (j = 0; j < dataValues.length; j++) {
                          if (dataValues[j].dirty) {
                              dataValues[j]._Kendo_SaveIt = 1;
                          };
                      }
                  }

                  // Daten speichern (Detail)
                  $scope.gridTestFrontEndValues(data[i]).dataSource.sync();
              }
          }

          // Daten speichern (Header)
          $scope.gridTestFrontEndHeaders.dataSource.sync();

          // Seite wieder laden
          if (actualTestFrontEndHeadersPage > 1) {

              // wieder auf Seite zurückspringen
              $scope.gridTestFrontEndHeaders.pager.dataSource.page(actualTestFrontEndHeadersPage);
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