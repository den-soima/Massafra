// App: KendoMaintainTemplateTest
var app = angular.module("KendoMaintainTemplateTest", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: MaintainTemplateTestCtrl
app.controller("MaintainTemplateTestCtrl", ['$document', '$scope', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsUnits', 'kendoOdsMaterials', 'refresh',
  function ($document, $scope, ngDialog, txt, kendoHelper, kendoOdsUnits, kendoOdsMaterials, refresh) {



      // Konstanten
      const TIMEINTERVAL_PER_DAY_MS = 86400000;
      const ENTERPRISE_KEY = 7000000000;
      const MATERIAL_DEFAULT_KEY = 83000000000;

      //    const EDITABLE_FIELDS_UPDATE_YHPSL = ['CoH', 'Line', 'YSToRYT','Unit']; // als Array, welche Felder in MaintainTemplateTestValue bearbeitbar sind

      const TIMEOUT_DELAY_DATABOUND = 500;  // notwendig um doppeltes Aufrufen zu vermeiden


      // Struktur: dataSourceElement   
      function c_dataSourceElement(dataItem, dataSource) {
          this.dataItem = dataItem;
          this.dataSource = dataSource;
      };


      // interne Variablen                       
      var m_IsRefreshDelayDialogVisible = false;
      var m_dataSourceMaintainTemplateTestValueElements = new Array();  // Array mit allen datasource Elementen die in Grid MaintainTemplateTestDaeta bereits gelesen wurden    
      var m_selectedtabStripMaintainTemplateTestHeaders = [];
      var m_pdfExportRunning = false;

      var m_dataValuesInitialized = false;
      var m_dataSourceMaintainTemplateTestInitialized = false;


      // Aktualisieren des Treeview      
      var m_expandedRows = undefined;
      var m_selectedRows = undefined;

      var m_timeoutMaintainTemplateTestHeaderHandle = null;
      var m_timeoutMaintainTemplateTestValueHandle = new Array();

      // -------------------------
      // Datenquelle des Grids: MaintainTemplateTestHeader
      var m_dataSourceMaintainTemplateTestHeaders = new kendo.data.DataSource({
          type: "odata-v4",
          transport: {
              read: {
                  url: $("#gatewayPath").data("value") + "odata/ods/ZWebTemplates",
                  datatype: 'json',
                  beforeSend: function (x) {
                      var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                      x.setRequestHeader("Authorization", auth);
                  }
              },

              create: {
                  url: function (data) {
                      return $("#gatewayPath").data("value") + "odata/ods/ZWebTemplates";
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
                      return $("#gatewayPath").data("value") + "odata/ods/ZWebTemplates(" + data._Key + ")";

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
                      return $("#gatewayPath").data("value") + "odata/ods/ZWebTemplates(" + data._Key + ")";
                  },
                  dataType: "json",
                  type: "DELETE",
                  beforeSend: function (x) {
                      var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                      x.setRequestHeader("Authorization", auth);
                  }
              },
              parameterMap: function (data, operation) {
                  if (operation === "create") {
                      return '{ "InsertID": "' + data.InsertID +
                                '","LastModified": "' + kendoHelper.getUTCDate(new Date(data.LastModified)) +
                                 '","LastModifiedUser": "' + data.LastModifiedUser +
                                 '","Created": "' + kendoHelper.getUTCDate(new Date(data.Created)) +
                                 '","CreatedUser": "' + data.CreatedUser +
                                 '","TemplateGlobalName": "' + data.TemplateGlobalName +
                                 '","TemplateLocalName": "' + data.TemplateLocalName +
                            '"}';
                  }

                  if (operation === "update") {
                      if (data._Kendo_SaveIt == 1) {
                          data._Kendo_SaveIt = 0;
                          return '{ "_Key": "' + data._Key +
                                    '","LastModified": "' + kendoHelper.getUTCDate(new Date(data.LastModified)) +
                                    '","LastModifiedUser": "' + data.LastModifiedUser +
                                    '","Created": "' + kendoHelper.getUTCDate(new Date(data.Created)) +
                                    '","CreatedUser": "' + data.CreatedUser +
                                    '","TemplateGlobalName": "' + data.TemplateGlobalName +
                                    '","TemplateLocalName": "' + data.TemplateLocalName +
                                  '"}';
                      }
                  }

                  if (operation === "read") {
                      var dataToRead = data;

                      // Abfrageerstellung ausführen
                      var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
                      result.$count = true;
                      delete result.$inlinecount;

                      // Filteranpassungen nach Abfrageerstellung
                      if (result.$filter) {
                          result.$filter = result.$filter.replace(/Created/g, "cast(Created, Edm.DateTimeOffset)");
                      }
                      return result;
                  }
              }
          },

          requestStart: function (e) {
              // Wenn noch nicht initialisiert, abbruch
              if (!m_dataValuesInitialized || !m_dataSourceMaintainTemplateTestInitialized) {
                  e.preventDefault();

                  // Datenquelle wurde initialisiert
                  m_dataSourceMaintainTemplateTestInitialized = true;

              }
          },

          schema: {
              model: {
                  id: "_Key",
                  fields: {
                      "_Key": { type: "number" },
                      "Created": { type: "date" },
                      "CreatedUser": { type: "string" },
                      "LastModified": { type: "date" },
                      "LastModifiedUser": { type: "string" },
                      "TemplateGlobalName": { type: "string" },
                      "TemplateLocalName": { type: "string" },
                      "Command": { type: "string", parse: function (value) { return 0; } },
                      "_Kendo_SaveIt": { type: "number", parse: function (value) { return 0; } },
                      "InsertID": { type: "string", defaultValue: "" },
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
      // Datenquelle des Grids: MaintainTemplateTestValue (Hilfsfunktion)
      // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
      var f_GetDataSourceMaintainTemplateTestValue = function (dataItem) {
          if (!m_dataSourceMaintainTemplateTestValueElements)
              m_dataSourceMaintainTemplateTestValueElements = new Array();
          // wenn gefunden, entsprechendes Element zurückgeben
          for (var i = 0; i < m_dataSourceMaintainTemplateTestValueElements.length; i++) {
              if (!!m_dataSourceMaintainTemplateTestValueElements[i].dataItem._Key == dataItem._Key) {
                  if (m_dataSourceMaintainTemplateTestValueElements[i].dataItem._Key == dataItem._Key)
                      return m_dataSourceMaintainTemplateTestValueElements[i].dataSource;
              }
              else if (!!m_dataSourceMaintainTemplateTestValueElements[i].dataItem.InsertID && !!dataItem.InsertID) {
                  if (m_dataSourceMaintainTemplateTestValueElements[i].dataItem.InsertID == dataItem.InsertID)
                      return m_dataSourceMaintainTemplateTestValueElements[i].dataSource;
              }
          }
          // Element anlegen
          var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceMaintainTemplateTestValueElement());

          // Filter/Sortierung setzen
          if (!!dataItem._Key && !isNaN(dataItem._Key))
              kendoHelper.setDataSourceFilters(newElement.dataSource, "_ZWebTemplateKey", "eq", parseInt(dataItem._Key));
          else
              kendoHelper.setDataSourceFilters(newElement.dataSource, "TemplateInsertID", "eq", dataItem.InsertID);

          // Sortierung setzen
   //       kendoHelper.setDataSourceSorts(newElement.dataSource, "Line", "desc");

          // Element hinzufügen
          m_dataSourceMaintainTemplateTestValueElements.push(newElement);
          return newElement.dataSource;
      };

      // Datenquelle des Grids: MaintainTemplateTestValue 

      var f_GetDataSourceMaintainTemplateTestValueElement = function () {
          return new kendo.data.DataSource({
              type: "odata-v4",
              transport: {
                  read: {
                      url: $("#gatewayPath").data("value") + "odata/ods/ZWebTemplateValueCategorys",

                      datatype: 'json',
                      beforeSend: function (xhr) {
                          var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                          xhr.setRequestHeader("Authorization", auth);
                      }
                  },
                  create: {
                      url: function (data) {
                          return $("#gatewayPath").data("value") + "odata/ods/ZWebTemplateValueCategorys";
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
                          return $("#gatewayPath").data("value") + "odata/ods/ZWebTemplateValueCategorys(" + data._Key + ")";
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
                          return $("#gatewayPath").data("value") + "odata/ods/ZWebTemplateValueCategorys(" + data._Key + ")";
                      },
                      dataType: "json",
                      type: "DELETE",
                      beforeSend: function (x) {
                          var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                          x.setRequestHeader("Authorization", auth);
                      }
                  },
                  parameterMap: function (data, operation) {
                      if (operation === "create") {
                          return '{ "Comment": "' + ((!data.Comment) ? "" : data.Comment) +
                                    ((!!data.TemplateInsertID) ? ',"TemplateInsertID": "' + data.TemplateInsertID : "") +
                                    ',"Created": "' + kendoHelper.getUTCDate(new Date(data.Created)) +
                                    ',"LastModified": "' + kendoHelper.getUTCDate(new Date(data.LastModified)) +
                                 '"}';

                      }
                      else if (operation === "update") {
                          if (data._Kendo_SaveIt == 1) {
                              data._Kendo_SaveIt = 0;
                              return '{ "_Key": "' + data._Key +
                                      '", "Comment": "' + data.Comment +
                                      ',"Created": "' + kendoHelper.getUTCDate(new Date(data.Created)) +
                                      ',"LastModified": "' + kendoHelper.getUTCDate(new Date(data.LastModified)) +
                                      '"}';
                          }
                      }
                      if (operation === "read") {
                          var dataToRead = data;

                          // Abfrageerstellung ausführen
                          var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
                          result.$count = true;
                          delete result.$inlinecount;
                          return result;
                      }

                  }
              },

              schema: {
                  model: {
                      id: "_Key",
                      fields: {
                          "_Key": { type: "number" },
                          "_ZWebTemplateKey": { type: "number" },
                          "Created": { type: "date" },
                          "LastModified": { type: "date" },
                          "Comment": { type: "string", editable: false },
                          "Command": { type: "string", parse: function (value) { return 0; } },
                          "_Kendo_SaveIt": { type: "number", defaultValue: 0, parse: function (value) { return 0; } },
                          "TemplateInsertID": { type: "string", defaultValue: "" },
                      }
                  }
              },
              batch: false,
              pageSize: 5,
              serverPaging: true,
              serverSorting: true,
              sort: { field: "Line", dir: "desc" },
              serverFiltering: true
          });
      };


      // interne Funktionen

      // Refresh events
      var f_OnAutomaticRefreshElapsed = function () {
          // Ermittle aktuelle Seite
          var actualMaintainTemplateTestHeadersPage = $scope.gridMaintainTemplateTestHeaders.pager.dataSource.page();

          // Nur wenn auf Seite 1 die Aktualisierung anstoßen
          if (!actualMaintainTemplateTestHeadersPage || actualMaintainTemplateTestHeadersPage == 1) {
              // aktualisieren
              $scope.OnGridMaintainTemplateTestRefresh();
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
                      $scope.OnGridMaintainTemplateTestSave();

                      // normale Aktualisierung
                      if ($scope.checkBoxAutomaticRefreshValue == 1)
                          refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
                  }
                      // Antwort: cancel and continue
                  else if (data.value == 2) {
                      refresh.StopAutomaticRefreshDelay();
                      // speichern
                      $scope.OnGridMaintainTemplateTestRefresh();
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
      // Init Header
      $scope.OnInitMaintainTemplateTestHeaders = function () {

          // Filter setzen
          kendoHelper.setDataSourceFilters(m_dataSourceMaintainTemplateTestHeaders, "Created", "gte", $scope.dtMaintainTemplateTestHeadersStartValue);    // gte Kendo Operator
          kendoHelper.setDataSourceFilters(m_dataSourceMaintainTemplateTestHeaders, "Created", "lte", $scope.dtMaintainTemplateTestHeadersStopValue);       // lte Kendo Operator


          // Sortierung setzen
          kendoHelper.setDataSourceSorts(m_dataSourceMaintainTemplateTestHeaders, "Created", "desc");


          // Datenquellen erstmalig initialisieren
          m_dataSourceMaintainTemplateTestHeaders.read();


          // Werte initialisiert
          m_dataValuesInitialized = true;

          // Datenquelle zuweisen
          $scope.gridMaintainTemplateTestHeaders.dataSource = m_dataSourceMaintainTemplateTestHeaders;

          // Datenquelle lesen
          $scope.gridMaintainTemplateTestHeaders.dataSource.read();

          // Autorefresh starten
          $scope.OnCheckBoxAutomaticRefreshChange();
      };

      // ----------------------------------------


      // ----------------------------------------
      // Checkbox für Automatische Aktualisierung
      $scope.checkBoxAutomaticRefreshValue = 1;

      // DateTimePicker für StartTime                                              
      $scope.dtMaintainTemplateTestHeadersStopValue = new Date(new Date(new Date().getTime() + 2 * TIMEINTERVAL_PER_DAY_MS));
      $scope.dtMaintainTemplateTestHeadersStartValue = new Date(new Date(new Date().getTime() - 2 * TIMEINTERVAL_PER_DAY_MS));



      // ----------------------------------------
      // Änderungen an Datums/Zeitauswahl - StartTime - Start
      $scope.dateTimePickerMaintainTemplateTestHeadersStart = {
          change: function () {
              $scope.OnGridMaintainTemplateTestRefresh();
          }
      };

      // Änderungen an Datums/Zeitauswahl - StartTime - Stop
      $scope.dateTimePickerMaintainTemplateTestHeadersStop = {
          change: function () {
              $scope.OnGridMaintainTemplateTestRefresh();
          }
      };


      // Optionen für Grid MaintainTemplateTestHeader
      $scope.gridMaintainTemplateTestHeaders = {
          // toolbar: ["pdf", "excel"],       // disabled due to bug in kendo ui 2015 
              toolbar: [{
                  template: '<button class="k-button k-button-icontext" ng-click="OnGridAddHeaderRow($event)"><span class="k-icon k-add"></span> ' + txt.TXT_INSERT_NEW_LINE + '</button>'
              }
              ],

              pdf: {
                  fileName: txt.TXT_PROCESS_PRODUCTION_PERFORMANCE + "-" + new Date() + ".pdf",
                  title: txt.TXT_PROCESS_PRODUCTION_PERFORMANCE,
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
                      $scope.OnGridMaintainTemplateTestRefresh();
                  });



              },
              excel: {
                  fileName: txt.TXT_PROCESS_PRODUCTION_PERFORMANCE + "-" + new Date() + ".xlsx",
                  allPages: true
              },
              dataBound:
              function (e) {


                  // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                  // dadurch entsteht Speicherverschmiss
                  if (m_timeoutMaintainTemplateTestHeaderHandle != null) {
                      // ggf. laufenden Timeout stoppen
                      clearTimeout(m_timeoutMaintainTemplateTestHeaderHandle);

                      // zurücksetzen
                      m_timeoutMaintainTemplateTestHeaderHandle = null;
                  }

                  if (m_timeoutMaintainTemplateTestHeaderHandle == null) {

                      // Timeout starten
                      m_timeoutMaintainTemplateTestHeaderHandle = setTimeout(function (grid) {

                          // Timeout abgelaufen
                          m_timeoutMaintainTemplateTestHeaderHandle = null;

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
                  // Automatische Aktualisierung anhalten und Verzögerung starten
                  if ($scope.checkBoxAutomaticRefreshValue == 1) {
                      refresh.StopAutomaticRefresh();
                      refresh.TriggerAutomaticRefreshDelay(f_OnAutomaticRefreshDelayElapsed);
                  }

                  var columnIndex = this.cellIndex(e.container);
                  var fieldName = this.thead.find("th").eq(columnIndex + 1).data("field");

              },

              save: function (e) {
                  if (e.values != undefined) {
                      // soll etwas gespeichert werden?
                      e.model._Kendo_SaveIt = 1;
                  }
              },

              columns: [ {
                  field: "Created",
                  title: txt.TXT_CREATED,
                  editor: kendoHelper.getEditorDateTime,
                  template: "#= kendo.toString(kendo.parseDate(Created, 'yyyy-MM-dd'), 'dd-MM-yyyy, HH:mm') #",
                  attributes: {
                      style: "text-align: center;"
                  },
                  filterable: false 
              }, {
                  field: "CreatedUser",
                  title: txt.TXT_CREATED_USER,
              }, {
                  field: "LastModified",
                  title: txt.TXT_LAST_MODIFIED,
                  template: "#= kendo.toString(kendo.parseDate(LastModified, 'yyyy-MM-dd'), 'dddd') #",
                  editable: false,
                  attributes: {
                      style: "text-align:left;"
                  },
                  filterable: false,
              }, {
                  field: "Template",
                  title: txt.TXT_TEMPLATE,
                  editor: function (container, options) {
                      if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                          $('<select kendo-combo-box k-min-length="1" k-data-text-field="\'TemplateGlobalName\'"  k-data-value-field="\'_Key\'" data-bind="value:' + options.field + '" k-data-source="TemplateGlobalName" />').appendTo(container);
                      } else {
                          $('<select kendo-combo-box k-min-length="1" k-data-text-field="\'TemplateLocalName\'" k-data-value-field="\'_Key\'" data-bind="value:' + options.field + '" k-data-source="TemplateLocalName" />').appendTo(container);
                      }
                  },
                  template: function (data) {
                      if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
                          if (data.TemplateGlobalName != null) {
                              return data.TemplateGlobalName;
                          }
                          return '';
                      } else {
                          if (data.TemplateLocalName != null) {
                              return data.TemplateLocalName;
                          }
                          return '';
                      }
                  }
              }, {
                  field: "Command",
                  title: " ",
                  attributes: {
                      style: "text-align: center;"
                  },
                  template: '<kendo-button class="button-small button-delete button" style="min-width:20px;" ng-click="OnGridMaintainTemplateRemoveRow($event)"></kendo-button>',
                  filterable: false
              }
              ]
      };



      // Optionen für Grid MaintainTemplateTestValue        
      $scope.gridMaintainTemplateTestValue = function (dataItem) {
          return {
              dataSource: f_GetDataSourceMaintainTemplateTestValue(dataItem),
              toolbar: [{
                  template: '<button class="k-button k-button-icontext" ng-click="OnGridAddValueRow($event)"><span class="k-icon k-add"></span> ' + txt.TXT_INSERT_NEW_LINE + '</button>'
              }
              ],

              dataBound: function (e) {

                  //Wenn Kommentar besteht, erweitern die Zeile
                  var data = e.sender.dataSource.view();
                  var len = data.length;
                  for (var i = 0; i < len; i++) {
                      var row = data[i];
                      var grid = $scope.gridMaintainTemplateTestHeaders;
                      if ((row.Comment).length > 0) {
                          grid.expandRow("tr[data-uid='" + row.uid + "']");
                      }
                  }


                  // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                  // dadurch entsteht Speicherverschmiss
                  if (m_timeoutMaintainTemplateTestValueHandle[dataItem.id] != null) {
                      // ggf. laufenden Timeout stoppen
                      clearTimeout(m_timeoutMaintainTemplateTestValueHandle[dataItem.id]);

                      // zurücksetzen
                      m_timeoutMaintainTemplateTestValueHandle[dataItem.id] = null;
                  }

                  if (m_timeoutMaintainTemplateTestValueHandle[dataItem.id] == null) {

                      // Timeout starten
                      m_timeoutMaintainTemplateTestValueHandle[dataItem.id] = setTimeout(function (grid) {

                          // Timeout abgelaufen
                          m_timeoutMaintainTemplateTestValueHandle[dataItem.id] = null;

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
                  var dataHeaderItem = $scope.gridMaintainTemplateTestHeaders.dataItem(detailHeaderRow.prev());

                  // Defaultwerte anlegen
         /*         if (e.model.isNew()) {
                      if (!e.model._ZWebTemplateKey) {
                          e.model._ZWebTemplateKey = dataHeaderItem._Key;
                      }
                      if (!e.model.UnitLocalName || !(typeof e.model.UnitLocalName === 'object')) {
                          e.model.Unit = { _Key: "81200000000", "UnitLocalName": "Unknown", "UnitGlobalName": "Unknown" };
                          e.model.UnitLocalName = "Unknown";
                          e.model.UnitGlobalName = "Unknown";
                          e.model.Unit = new kendo.data.ObservableObject(e.model.Unit);
                      }
                  }                  */
              },


              save: function (e) {
                  if (e.values != undefined) {
                      // soll etwas gespeichert werden?
                      e.model._Kendo_SaveIt = 1;
                  }
              },



              columns: [{
                  field: "Created",
                  title: txt.TXT_CREATED,
                  editor: kendoHelper.getEditorDateTime,
                  template: "#= kendo.toString(kendo.parseDate(Created, 'yyyy-MM-dd'), 'dd-MM-yyyy, HH:mm') #",
                  attributes: {
                      style: "text-align: center;"
                  },
                  filterable: false
              }, {
                  field: "LastModified",
                  title: txt.TXT_LAST_MODIFIED,
                  template: "#= kendo.toString(kendo.parseDate(LastModified, 'yyyy-MM-dd'), 'dddd') #",
                  editable: false,
                  attributes: {
                      style: "text-align:left;"
                  },
                  filterable: false,
              }, {
                  field: "Line",
                  title: txt.TXT_LINE,
                  attributes: {
                      style: "text-align:center;"
                  },
                  editor: function (container, options) {
                      $('<input name="' + options.field + '"/>').appendTo(container).kendoDropDownList({
                          dataSource: new kendo.data.DataSource({
                              data: [{ title: "-" }, { title: "1" }, { title: "2" }, { title: "3" }, { title: "4" }, { title: "K" }]
                          }),
                          dataValueField: "Line",
                          dataTextField: "title",
                          autobind: false
                      });
                  },

              }, {
                  field: "Command",
                  title: " ",
                  attributes: {
                      style: "text-align: center;"
                  },
                  template: '<kendo-button class="button-small button-delete button" style="min-width:20px;" ng-click="OnGridMaintainTemplateRemoveRow($event)"></kendo-button>',
                  filterable: false
              }]
          };
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



      $scope.OnRefSaveSaveFocus = function () {
          // Selektierte & expandierte Zeilen merken
          var grid = $scope.gridMaintainTemplateTestHeaders;
          m_expandedRows = undefined;
          m_expandedRows = $.map(grid.tbody.find(":has(> .k-hierarchy-cell .k-minus)"), function (row) {
              if (!row)
                  return false;

              if (!$(row))
                  return false;

              if ($(row).closest('[kendo-grid]').length <= 0)
                  return false;

              if (!$(row).closest('[kendo-grid]').data("kendoGrid"))
                  return false;

              if (!$(row).closest('[kendo-grid]').data("kendoGrid").dataSource)
                  return false;

              var uid = $(row).data("uid");
              if (uid == undefined)
                  return false;

              /*
               var data = $scope.gridMaintainTemplateTestHeaders.dataSource.view();
               for (var i = 0; i < data.length; i++) {
                 // nur neue Zeilen betrachten
                 if (data[i].isNew()) {
                   // nur Zeilen betrachten deren InsertID noch nicht belegt sind
                   if (data._Key == undefined || data._Key == "") {
                     data._Key = dataItem.InsertID;
                   }
                 }
               }                              */

              return $(row).closest('[kendo-grid]').data("kendoGrid").dataSource.getByUid(uid).id;
          });


          m_selectedRows = undefined;
          m_selectedRows = $.map(grid.tbody.find(".k-state-selected"), function (row) {
              if (!row)
                  return false;

              if (!$(row))
                  return false;

              if ($(row).closest('[kendo-grid]').length <= 0)
                  return false;

              if (!$(row).closest('[kendo-grid]').data("kendoGrid"))
                  return false;

              if (!$(row).closest('[kendo-grid]').data("kendoGrid").dataSource)
                  return false;

              var uid = $(row).data("uid");
              if (uid == undefined)
                  return false;

              return $(row).closest('[kendo-grid]').data("kendoGrid").dataSource.getByUid(uid).id;
          });

      }

      // Refresh/Cancel
      $scope.OnGridMaintainTemplateTestRefresh = function () {
          $scope.OnRefSaveSaveFocus();

          // Init
          if (!m_dataValuesInitialized || !m_dataSourceMaintainTemplateTestInitialized)
              return;

          // Request sperren
          m_dataValuesInitialized = false;

          // Filter setzen
          kendoHelper.setDataSourceFilters(m_dataSourceMaintainTemplateTestHeaders, "Created", "gte", $scope.dtMaintainTemplateTestHeadersStartValue);    // gte Kendo Operator
          kendoHelper.setDataSourceFilters(m_dataSourceMaintainTemplateTestHeaders, "Created", "lte", $scope.dtMaintainTemplateTestHeadersStopValue);       // lte Kendo Operator

          // Sortierung setzen                                                              
          kendoHelper.setDataSourceSorts(m_dataSourceMaintainTemplateTestHeaders, "Created", "desc");

          // Request entsperren
          m_dataValuesInitialized = true;

          // Daten lesen  
          $scope.gridMaintainTemplateTestHeaders.dataSource.read();

          // Refreshhandling
          refresh.StopAutomaticRefreshDelay();
          refresh.StopAutomaticRefresh();
          if ($scope.checkBoxAutomaticRefreshValue == 1) {
              refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
          }
      };



      // Speichern
      $scope.OnGridMaintainTemplateTestSave = function () {
          $scope.OnRefSaveSaveFocus();

          // Ermittle Aktuelle Seite
          var actualMaintainTemplateTestHeadersPage = $scope.gridMaintainTemplateTestHeaders.pager.dataSource.page();

          // Daten zum speichern markieren (Header)
          var data = $scope.gridMaintainTemplateTestHeaders._data;
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
                  if ($scope.gridMaintainTemplateTestValue) {
                      var dataDatas = f_GetDataSourceMaintainTemplateTestValue(data[i])._data;
                      for (j = 0; j < dataDatas.length; j++) {
                          if (dataDatas[j].dirty) {
                              dataDatas[j]._Kendo_SaveIt = 1;
                          }; 
                      }
                  }

                  // Daten speichern (Detail)
                  $scope.gridMaintainTemplateTestValue(data[i]).dataSource.sync();
              }
          }

          // Daten speichern (Header)
          $scope.gridMaintainTemplateTestHeaders.dataSource.sync();

          // Seite wieder laden
          if (actualMaintainTemplateTestHeadersPage > 1) {

              // wieder auf Seite zurückspringen
              $scope.gridMaintainTemplateTestHeaders.pager.dataSource.page(actualMaintainTemplateTestHeadersPage);
          }

          // Refreshhandling
          refresh.StopAutomaticRefreshDelay();
          refresh.StopAutomaticRefresh();
          if ($scope.checkBoxAutomaticRefreshValue == 1) {
              refresh.StartAutomaticRefresh(f_OnAutomaticRefreshElapsed);
          }
      };


      // Neue Zeile (Header) wurde hinzugefügt
      $scope.OnGridAddHeaderRow = function (e) {
          $scope.gridMaintainTemplateTestHeaders.addRow();

          // Mit Defaultwerten belegen
          var data = $scope.gridMaintainTemplateTestHeaders.dataSource.view();
          for (var i = 0; i < data.length; i++) {
              // nur neue Zeilen betrachten
              if (data[i].isNew()) {
                  // nur Zeilen betrachten deren InsertID noch nicht belegt sind
                  if (data[i].InsertID == undefined || data[i].InsertID == "") {
                      data[i].InsertID = new Date().getTime() + "." + new Date().getMilliseconds();
                  }
                  console.log("dasdasd");
              }
          }
      };

      // Neue Zeile (Value) wurde hinzugefügt
      $scope.OnGridAddValueRow = function (e) {
              if (!e || !e.target)
                  return;

              // Detailzeile des Headers ermitteln
              var detailHeaderRow = $(e.target).closest("tr.k-detail-row");

              if (!detailHeaderRow)
                  return;

              // passende Kopfzeile ermitteln
              var dataHeaderItem = $scope.gridMaintainTemplateTestHeaders.dataItem(detailHeaderRow.prev());

              if (!dataHeaderItem)
                  return;

              // Daten & Grid ermitteln   
              var grid = $(e.target).closest('div[kendo-grid]').data("kendoGrid");

              // Zeile anlegen
              grid.addRow();


              // Mit Defaultwerten belegen
              var data = grid.dataSource.view();

              for (var i = 0; i < data.length; i++) {
                  // nur neue Zeilen betrachten
                  if (data[i].isNew()) {
                      // nur Zeilen betrachten deren InsertID noch nicht belegt sind
                      if (data[i].InsertID == undefined || data[i].InsertID == "") {
                          data[i].InsertID = new Date().getTime() + "." + new Date().getMilliseconds();
                      }
                      // nur Zeilen betrachten deren InsertID noch nicht belegt sind
                      if (data[i].TemplateInsertID == undefined || data[i].TemplateInsertID == "") {
                          data[i].TemplateInsertID = dataHeaderItem.InsertID;
                      }
                      if (data[i].ZWebTemplateKey == undefined || data[i].ZWebTemplateKey == "") {
                          data[i].ZWebTemplateKey = dataHeaderItem._Key;
                      }
                  }
              }
          };



      // Zeile zum löschen markieren
      $scope.OnGridMaintainTemplateRemoveRow = function (e) {
          if (!e || !e.target)
              return;

          // Datenzeile ermitteln
          var row = $(e.target).closest("tr");

          if (!row)
              return;

          // Daten & Grid ermitteln    
          var grid = row.closest("div[kendo-grid]").data("kendoGrid");

          if (!grid)
              return;

          // entfernen
          grid.removeRow(row);
      };

  }

]);

