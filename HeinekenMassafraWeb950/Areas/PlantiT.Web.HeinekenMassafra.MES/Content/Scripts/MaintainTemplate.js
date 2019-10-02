// App: KendoMaintainTemplate
var app = angular.module("KendoMaintainTemplate", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: MaintainTemplateCtrl
app.controller("MaintainTemplateCtrl", ['$document', '$scope', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsMaterials', 'kendoOdsValueCategory', 'kendoOdsEnumerationTexts', 'refresh',
  function ($document, $scope, ngDialog, txt, kendoHelper, kendoOdsMaterials, kendoOdsValueCategory, kendoOdsEnumerationTexts, refresh) {



      // Konstanten

      const EDITABLE_FIELDS_UPDATE_MTH = ['TemplateName'];
      const EDITABLE_FIELDS_UPDATE_MTV = ['Position', 'ValueCategory'];        
      const EDITABLE_FIELDS_CREATE_MTH = ['TemplateName'];
      const EDITABLE_FIELDS_CREATE_MTV = ['Position', 'ValueCategory'];

      const ENUM_TEMPLATE = 'Template Type';

      const DEFAULT_VALUE_CATEGORY_KEY = 82000000000;

      const TIMEOUT_DELAY_DATABOUND = 500;  // notwendig um doppeltes Aufrufen zu vermeiden


      // Struktur: dataSourceElement   
      function c_dataSourceElement(dataItem, dataSource) {
          this.dataItem = dataItem;
          this.dataSource = dataSource;
      };


      // interne Variablen                       
      var m_dataSourceMaintainTemplateValueElements = new Array();  // Array mit allen datasource Elementen die in Grid MaintainTemplateDaeta bereits gelesen wurden    
      var m_selectedtabStripMaintainTemplateHeaders = [];
      var m_pdfExportRunning = false;

      var m_dataValuesInitialized = false;
      var m_dataSourceMaintainTemplateInitialized = false;

      // Aktualisieren      
      var m_expandedRows = undefined;
      var m_selectedRows = undefined;

      var m_timeoutMaintainTemplateHeaderHandle = null;
      var m_timeoutMaintainTemplateValueHandle = new Array();


      // -------------------------
      // Datenquelle des Grids: MaintainTemplateHeader
      var m_dataSourceMaintainTemplateHeaders = new kendo.data.DataSource({
          type: "odata-v4",
          transport: {
              read: {
                  url: $("#gatewayPath").data("value") + "odata/ods/ZTemplates?$expand=EnumerationText($select=_Key,EnumerationTextGlobalName,EnumerationTextLocalName,_Name)",
                  datatype: 'json',
                  beforeSend: function (x) {
                      var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                      x.setRequestHeader("Authorization", auth);
                  },
                  cache: false
              },

              create: {
                  url: function (data) {
                      return $("#gatewayPath").data("value") + "odata/ods/ZTemplates";
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
                      return $("#gatewayPath").data("value") + "odata/ods/ZTemplates(" + data._Key + ")";

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
                      return $("#gatewayPath").data("value") + "odata/ods/ZTemplates(" + data._Key + ")";
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
                                '","LastModified": "' + kendoHelper.getUTCDate(new Date()) +
                                '","LastModifiedUser": "' + $("#portalUser").data("value") +
                                '","Created": "' + kendoHelper.getUTCDate(new Date()) +
                                '","CreatedUser": "' + $("#portalUser").data("value") +
                                '","_Name": "' + data.InsertID + 
                                '","TemplateGlobalName": "' + ((!!data.TemplateGlobalName) ? data.TemplateGlobalName : data.TemplateLocalName) +
                                '","TemplateLocalName": "' + ((!!data.TemplateLocalName) ? data.TemplateLocalName : data.TemplateGlobalName) +
                                '","_UsageEnumerationTextLink": "' + $("#select_usage").data("value") +
                                 '"}';
                  }

                  if (operation === "update") {
                      if (data._Kendo_SaveIt == 1) {
                          data._Kendo_SaveIt = 0;
                          return '{ "_Key": "' + data._Key +
                                    '","LastModified": "' + kendoHelper.getUTCDate(new Date()) +
                                    '","LastModifiedUser": "' + $("#portalUser").data("value") +
                                    '","Created": "' + kendoHelper.getUTCDate(new Date(data.Created)) +
                                    '","CreatedUser": "' + data.CreatedUser + 
                                    '","_Name": "' + data.InsertID + '"' +
                                    ((!!data.TemplateGlobalName) ? ',"TemplateGlobalName": "' + data.TemplateGlobalName : data.TemplateLocalName) + '"' +
                                    ((!!data.TemplateLocalName) ? ',"TemplateLocalName": "' + data.TemplateLocalName : data.TemplateGlobalName) +
                                    '","_UsageEnumerationTextLink": "' + ((!data._UsageEnumerationTextLink) ? ' ' : data._UsageEnumerationTextLink) +
                                  '"}';
                      }
                  }

                  if (operation === "read") {

                      var dataToRead = data;




                      // Filteranpassungen vor Abfrageerstellung
                      if (dataToRead.filter && dataToRead.filter.filters) {
                          for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                              if (dataToRead.filter.filters[i].field == "TemplateName" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                  dataToRead.filter.filters[i].field = "TemplateLocalName";
                              if (dataToRead.filter.filters[i].field == "TemplateName" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                  dataToRead.filter.filters[i].field = "TemplateGlobalName";
                          }
                      }
                 
                      // Abfrageerstellung ausführen
                      var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
                      result.$count = true;
                      delete result.$inlinecount;

                      // Filteranpassungen nach Abfrageerstellung
           /*           if (result.$filter) {
                          result.$filter = result.$filter.replace(/Created/g, "cast(Created, Edm.DateTimeOffset)");
                      }                */
                      return result;
                  }
              }
          },

          requestStart: function (e) {
              // Wenn noch nicht initialisiert, abbruch
              if (!m_dataValuesInitialized || !m_dataSourceMaintainTemplateInitialized) {
                  e.preventDefault();

                  // Datenquelle wurde initialisiert
                  m_dataSourceMaintainTemplateInitialized = true;

              }
          },

          schema: {
              model: {
                  id: "_Key",
                  fields: {
                      "_Key": { type: "number" },
                      "Created": { type: "date" },
                      "CreatedUser": { type: "string" },
                      "_UsageEnumerationTextLink": { type: "string" },
                      "LastModified": { type: "date" },
                      "LastModifiedUser": { type: "string" },
                      "LastModifiedUser": { type: "string" },
                      "TemplateName": { type: "string", parse: function (value) { return value || {} } },
                      "TemplateGlobalName": { type: "string" },
                      "TemplateLocalName": { type: "string" },
                      "EnumerationTextGlobalName": { field: "EnumerationText.EnumerationTextGlobalName", type: "string" },
                      "EnumerationTextLocalName": { field: "EnumerationText.EnumerationTextLocalName", type: "string" },
                      "Command": { type: "string", parse: function (value) { return 0; } },
                      "_Kendo_SaveIt": { type: "number", parse: function (value) { return 0; } },
                      "InsertID": { type: "string", defaultValue: "" },
                  }
              },
              parse: function (response) {
          var values = response.value,
              n = values.length,
              i = 0,
              value;
          for (; i < n; i++) {
              value = values[i];
              value.TemplateName =
              PCommonPortalMethods.GetSiteLanguage() == "en" ? value.EnumerationText.EnumerationTextGlobalName : value.EnumerationText.EnumerationTextLocalName;
          }

              $scope.TemplateHeaderName = values[0] != null ? values[0].TemplateName : null;

          return response;
      }
          },
          batch: false,
          pageSize: 10,
          serverPaging: true,
          serverSorting: true,
          serverFiltering: true
      });


      // -------------------------
      // Datenquelle des Grids: MaintainTemplateValue (Hilfsfunktion)
      // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
      var f_GetDataSourceMaintainTemplateValue = function (dataItem) {
          if (!m_dataSourceMaintainTemplateValueElements)
              m_dataSourceMaintainTemplateValueElements = new Array();
          // wenn gefunden, entsprechendes Element zurückgeben
          for (var i = 0; i < m_dataSourceMaintainTemplateValueElements.length; i++) {
              if (!!m_dataSourceMaintainTemplateValueElements[i].dataItem._Key == dataItem._Key) {
                  if (m_dataSourceMaintainTemplateValueElements[i].dataItem._Key == dataItem._Key)
                      return m_dataSourceMaintainTemplateValueElements[i].dataSource;
              }
              else if (!!m_dataSourceMaintainTemplateValueElements[i].dataItem.InsertID && !!dataItem.InsertID) {
                  if (m_dataSourceMaintainTemplateValueElements[i].dataItem.InsertID == dataItem.InsertID)
                      return m_dataSourceMaintainTemplateValueElements[i].dataSource;
              }
          }
          // Element anlegen
          var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceMaintainTemplateValueElement());

          // Filter/Sortierung setzen
          if (!!dataItem._Key && !isNaN(dataItem._Key))
              kendoHelper.setDataSourceFilters(newElement.dataSource, "_ZTemplateKey", "eq", parseInt(dataItem._Key));
          else
              kendoHelper.setDataSourceFilters(newElement.dataSource, "TemplateInsertID", "eq", dataItem.InsertID);

          // Element hinzufügen
          m_dataSourceMaintainTemplateValueElements.push(newElement);
          return newElement.dataSource;
      };

      // Datenquelle des Grids: MaintainTemplateValue 

      var f_GetDataSourceMaintainTemplateValueElement = function () {
          return new kendo.data.DataSource({
              type: "odata-v4",
              transport: {
                  read: {
                      url: $("#gatewayPath").data("value") + "odata/ods/ZTemplateValueCategories?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)",

                      datatype: 'json',
                      beforeSend: function (xhr) {
                          var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                          xhr.setRequestHeader("Authorization", auth);
                      },
                      cache: false
                  },
                  create: {
                      url: function (data) {
                          return $("#gatewayPath").data("value") + "odata/ods/ZTemplateValueCategories?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)";
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
                          return $("#gatewayPath").data("value") + "odata/ods/ZTemplateValueCategories(" + data._Key + ")?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)";
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
                          return $("#gatewayPath").data("value") + "odata/ods/ZTemplateValueCategories(" + data._Key + ")?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)";
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
                          return '{ "Created": "' + kendoHelper.getUTCDate(new Date()) +
                                    '", "Position": "' + data.Position +
                                    '","LastModified": "' + kendoHelper.getUTCDate(new Date()) + 
                                    ((data.ValueCategory._Key) ? '","_ValueCategoryKey": "' + data.ValueCategory._Key : "") + '"' +
                                    ((!!data.TemplateInsertID) ? ',"TemplateInsertID": "' + data.TemplateInsertID : null) +
                                    '","_ZTemplateKey": ' + ((!data._ZTemplateKey || data._ZTemplateKey == null) ? null : '"' + data._ZTemplateKey + '"') +
                                 '}';

                      }
                      else if (operation === "update") {
                          if (data._Kendo_SaveIt == 1) {
                              data._Kendo_SaveIt = 0;
                              return '{ "_Key": "' + data._Key +
                                        '", "Position": "' + data.Position +
                                        '","Created": "' + kendoHelper.getUTCDate(new Date(data.Created)) +
                                        '","LastModified": "' + kendoHelper.getUTCDate(new Date()) + 
                                        ((data.ValueCategory._Key) ? '","_ValueCategoryKey": "' + data.ValueCategory._Key : "") + '"' +
                                        ((!!data.TemplateInsertID) ? ',"TemplateInsertID": "' + data.TemplateInsertID : null) + '"' +
                         //               ((!!data._ZTemplateKey) ? ',"_ZTemplateKey": "' + data._ZTemplateKey : 0) + '"' +
                                      '}';
                          }
                      }
                      if (operation === "read") {
                          var dataToRead = data;

                          // Filteranpassungen vor Abfrageerstellung
                          if (dataToRead.filter && dataToRead.filter.filters) {
                              for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                                  if (!!dataToRead.filter.filters[i].field) {
                                      if (dataToRead.filter.filters[i].field == "Created")
                                          dataToRead.filter.filters[i].field = "Created";
                                      if (dataToRead.filter.filters[i].field == "LastModified")
                                          dataToRead.filter.filters[i].field = "LastModified";
                                      if (dataToRead.filter.filters[i].field == "Position")
                                          dataToRead.filter.filters[i].value = parseInt(dataToRead.filter.filters[i].value);  // damit Nummer abgefragt wird        
                                      if (dataToRead.filter.filters[i].field == "ValueCategory" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                          dataToRead.filter.filters[i].field = "ValueCategoryLocalName";
                                      if (dataToRead.filter.filters[i].field == "ValueCategory" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                          dataToRead.filter.filters[i].field = "ValueCategoryGlobalName";

                                  }
                              }
                          }
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
                          "_ZTemplateKey": { type: "number" },
                          "Position": { type: "number" },
                          "Created": { type: "date" },                     
                          "LastModified": { type: "date" },
                          "ValueCategory": { field: "ValueCategory", type: "string", parse: function (value) { return value || {} } },      
                          "ValueCategoryLocalName": { field: "ValueCategory.ValueCategoryLocalName", type: "string" },
                          "ValueCategoryGlobalName": { field: "ValueCategory.ValueCategoryGlobalName", type: "string" },
                          "Command": { type: "string", parse: function (value) { return 0; } },
                          "_Kendo_SaveIt": { type: "number", defaultValue: 0, parse: function (value) { return 0; } },
                          "TemplateInsertID": { type: "string", defaultValue: "" },
                      }
                  }
              },
              batch: false,
              pageSize: 20,
              serverPaging: true,
              serverSorting: true,
              serverFiltering: true
          });
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

      // Parameter von URL
      $scope.paramURL_select_usage = ($("#select_usage").data("value") == "") ? undefined : $("#select_usage").data("value");

   
      // ----------------------------------------
      // Init Header
      $scope.OnInitMaintainTemplateHeaders = function (select_usage) {

          $scope.TemplateHeaderName = "";

          // Template Initialisieren     
          kendoOdsEnumerationTexts.init(ENUM_TEMPLATE);

          select_usage = $scope.paramURL_select_usage;


          if ((select_usage)) {
              kendoHelper.setDataSourceFilters(m_dataSourceMaintainTemplateHeaders, "_UsageEnumerationTextLink", "eq", select_usage); // eq Kendo Operator 
          }
          else {
              kendoHelper.setDataSourceFilters(m_dataSourceMaintainTemplateHeaders, "_UsageEnumerationTextLink", "eq", undefined); // eq Kendo Operator 
          }

          // Sortierung setzen
          kendoHelper.setDataSourceSorts(m_dataSourceMaintainTemplateHeaders, "Created", "desc");


          // Datenquellen erstmalig initialisieren
          m_dataSourceMaintainTemplateHeaders.read();


          // Werte initialisiert
          m_dataValuesInitialized = true;

          // Datenquelle zuweisen
          $scope.gridMaintainTemplateHeaders.dataSource = m_dataSourceMaintainTemplateHeaders;

          // Datenquelle lesen
          $scope.gridMaintainTemplateHeaders.dataSource.read();

      };

      // ----------------------------------------




      // Optionen für Grid MaintainTemplateHeader
      $scope.gridMaintainTemplateHeaders = {
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
                      $scope.OnGridMaintainTemplateRefresh();
                  });



              },
              excel: {
                  fileName: txt.TXT_PROCESS_PRODUCTION_PERFORMANCE + "-" + new Date() + ".xlsx",
                  allPages: true
              },
              dataBound:
              function (e) {

                  // SAP Enums holen und initialisieren
                  var gridData = this.dataSource.view();

                  for (var i = 0; i < gridData.length; i++) {
                      if (!!gridData[i]._EnumerationLink)
                          kendoOdsEnumerationTexts.init(gridData[i]._EnumerationLink);
                  }

                  // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                  // dadurch entsteht Speicherverschmiss
                  if (m_timeoutMaintainTemplateHeaderHandle != null) {
                      // ggf. laufenden Timeout stoppen
                      clearTimeout(m_timeoutMaintainTemplateHeaderHandle);

                      // zurücksetzen
                      m_timeoutMaintainTemplateHeaderHandle = null;
                  }

                  if (m_timeoutMaintainTemplateHeaderHandle == null) {

                      // Timeout starten
                      m_timeoutMaintainTemplateHeaderHandle = setTimeout(function (grid) {

                          // Timeout abgelaufen
                          m_timeoutMaintainTemplateHeaderHandle = null;

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
                  // bearbeitbar?              
                  var columnIndex = this.cellIndex(e.container);
                  var fieldName = this.thead.find("th").eq(columnIndex + 1).data("field");

                  if (e.model.isNew()) {
                      if (EDITABLE_FIELDS_CREATE_MTH.indexOf(fieldName) < 0)
                          this.closeCell();
                  }
                  else {
                      if (EDITABLE_FIELDS_UPDATE_MTH.indexOf(fieldName) < 0)
                          this.closeCell();
                  }
              },

              save: function (e) {
                  if (e.values != undefined) {
                      // soll etwas gespeichert werden?
                      e.model._Kendo_SaveIt = 1;
                  }
              },

              columns: [{
                  field: "TemplateName",
                  title: txt.TXT_TEMPLATE_NAME,
                  editor: TemplateEditor,
                  template: function (data) {
                      if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
                          if (data.TemplateGlobalName != null) {
                              return data.TemplateGlobalName;
                          }
                          return data.TemplateLocalName;
                      } else {
                          if (data.TemplateLocalName != null) {
                              return data.TemplateLocalName;
                          }
                          return data.TemplateGlobalName;
                      }
                  },
                  attributes: {
                      style: "text-align: center;"
                  },
              }, {
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
                  attributes: {
                      style: "text-align: center;"
                  },
              }, {
                  field: "LastModified",
                  title: txt.TXT_LAST_MODIFIED,
                  template: "#= kendo.toString(kendo.parseDate(LastModified, 'yyyy-MM-dd'), 'dd-MM-yyyy, HH:mm') #",
                  editable: false,
                  attributes: {
                      style: "text-align: center;"
                  },
                  filterable: false,
              }, {
                  field: "LastModifiedUser",
                  title: txt.TXT_LAST_MODIFIED_USER,
                  attributes: {
                      style: "text-align: center;"
                  },
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

      // Datenquelle für Unit/Material/ValueCategory
      $scope.dataSourceKendoOdsMaterials = kendoOdsMaterials.getDataSource;
      $scope.dataSourceKendoOdsValueCategory = kendoOdsValueCategory.getDataSource;
      $scope.dataSourceEnumerationTexts = kendoOdsEnumerationTexts.getDataSource;


      // Optionen für Grid MaintainTemplateValue        
      $scope.gridMaintainTemplateValue = function (dataItem) {
          return  {
              dataSource: f_GetDataSourceMaintainTemplateValue(dataItem),
              toolbar: [{
                  template: '<button class="k-button k-button-icontext" ng-click="OnGridAddValueRow($event)"><span class="k-icon k-add"></span> ' + txt.TXT_INSERT_NEW_LINE + '</button>'
              }], 
              dataBound: function (e) {

                  // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                  // dadurch entsteht Speicherverschmiss
                  if (m_timeoutMaintainTemplateValueHandle[dataItem.id] != null) {
                      // ggf. laufenden Timeout stoppen
                      clearTimeout(m_timeoutMaintainTemplateValueHandle[dataItem.id]);

                      // zurücksetzen
                      m_timeoutMaintainTemplateValueHandle[dataItem.id] = null;
                  }

                  if (m_timeoutMaintainTemplateValueHandle[dataItem.id] == null) {

                      // Timeout starten
                      m_timeoutMaintainTemplateValueHandle[dataItem.id] = setTimeout(function (grid) {

                          // Timeout abgelaufen
                          m_timeoutMaintainTemplateValueHandle[dataItem.id] = null;

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
                  
                  var columnIndex = this.cellIndex(e.container);
                  var fieldName = this.thead.find("th").eq(columnIndex).data("field");

                  // Detailzeile des Headers ermitteln
                  var detailHeaderRow = e.sender.tbody.closest("tr.k-detail-row");

                  // passende Kopfzeile ermitteln
                  var dataHeaderItem = $scope.gridMaintainTemplateHeaders.dataItem(detailHeaderRow.prev());

                  // Defaultwerte anlegen
                 if (e.model.isNew()) {
                     if (!e.model._ZTemplateKey) {
                         e.model._ZTemplateKey = dataHeaderItem._Key;
                      }  
                     if (!e.model.ValueCategory || !(typeof e.model.ValueCategory === 'object')) {
                          e.model.ValueCategory = { _Key: DEFAULT_VALUE_CATEGORY_KEY, "ValueCategoryLocalName": "Unknown", "ValueCategoryGlobalName": "Unknown" };
                          e.model.ValueCategoryLocalName = "Unknown";
                          e.model.ValueCategoryGlobalName = "Unknown";
                          e.model.ValueCategory = new kendo.data.ObservableObject(e.model.ValueCategory);
                      }               
                 }

                  // bearbeitbar? 
                 if (e.model.isNew()) {
                     if (EDITABLE_FIELDS_CREATE_MTV.indexOf(fieldName) < 0)
                         this.closeCell();
                 }
                 else {
                     if (EDITABLE_FIELDS_UPDATE_MTV.indexOf(fieldName) < 0)
                         this.closeCell();
                 }
              },


              save: function (e) {
                  if (e.values != undefined) {
                      // soll etwas gespeichert werden?
                      e.model._Kendo_SaveIt = 1;
                  }
              },

              change: function (e) {
                  if (e.values == undefined) {
                      return;
                  }
              },



              columns: [{
                  field: "Position",
                  title: txt.TXT_POSITION,
                  attributes: {
                      style: "text-align: center;"
                  },
                  template: '#= kendo.toString(Position, "n0") #',
              }, {
                field: "ValueCategory",
                title: txt.TXT_VALUE_CATEGORY,
                width: 400,
                  attributes: {
                      style: "text-align: center;"
                  },
                  editor: function (container, options) {
                      if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                          $('<select kendo-combo-box k-min-length="1" k-data-text-field="\'ValueCategoryGlobalName\'" k-data-value-field="\'_Key\'" data-bind="value:' + options.field + '" k-data-source="dataSourceKendoOdsValueCategory(undefined)" />').appendTo(container);
                      }
                      else {
                          $('<select kendo-combo-box k-min-length="1" k-data-text-field="\'ValueCategoryLocalName\'" k-data-value-field="\'_Key\'" data-bind="value:' + options.field + '" k-data-source="dataSourceKendoOdsValueCategory(undefined)" />').appendTo(container);
                      }
                  },       
                 template: function (data) {
                      if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
                          if (data.ValueCategory.ValueCategoryGlobalName != null && data.ValueCategory.ValueCategoryGlobalName != '') {
                              return data.ValueCategory.ValueCategoryGlobalName;
                          }
                          return data.ValueCategory.ValueCategoryLocalName;
                      }
                      else {
                          if (data.ValueCategory.ValueCategoryLocalName != null && data.ValueCategory.ValueCategoryLocalName != '') {
                              return data.ValueCategory.ValueCategoryLocalName;
                          }
                          return data.ValueCategory.ValueCategoryGlobalName;
                      }
                 }
              }, {
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
                  template: "#= kendo.toString(kendo.parseDate(LastModified, 'yyyy-MM-dd'), 'dd-MM-yyyy, HH:mm') #",
                  editable: false,
                  attributes: {
                      style: "text-align:center;"
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


      function TemplateEditor(container, options) {
          if(PCommonPortalMethods.GetSiteLanguage() == 'en') {
              var input = $('<input type="text" class="k-input k-textbox" name="TemplateGlobalName" data-bind="value:TemplateGlobalName">');
              input.appendTo(container);
          }
          else {
              var input = $('<input type="text" class="k-input k-textbox" name="TemplateLocalName" data-bind="value:TemplateLocalName">');
                  input.appendTo(container);
          }
      }


      $scope.OnRefSaveSaveFocus = function () {
          // Selektierte & expandierte Zeilen merken
          var grid = $scope.gridMaintainTemplateHeaders;
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
      $scope.OnGridMaintainTemplateRefresh = function (select_usage) {
          $scope.OnRefSaveSaveFocus();

          // Template Initialisieren     
          kendoOdsEnumerationTexts.init(ENUM_TEMPLATE);

          // Init
          if (!m_dataValuesInitialized || !m_dataSourceMaintainTemplateInitialized)
              return;

          // Request sperren
          m_dataValuesInitialized = false;

          // Template Initialisieren     
          kendoOdsEnumerationTexts.init(ENUM_TEMPLATE);

          select_usage = $scope.paramURL_select_usage;

          if (select_usage) {
              kendoHelper.setDataSourceFilters(m_dataSourceMaintainTemplateHeaders, "_UsageEnumerationTextLink", "eq", select_usage); // eq Kendo Operator 
          }
          else {
              kendoHelper.setDataSourceFilters(m_dataSourceMaintainTemplateHeaders, "_UsageEnumerationTextLink", "eq", undefined); // eq Kendo Operator 
          }

          // Sortierung setzen                                                              
          kendoHelper.setDataSourceSorts(m_dataSourceMaintainTemplateHeaders, "Created", "desc");

          // Request entsperren
          m_dataValuesInitialized = true;

          // Daten lesen  
          $scope.gridMaintainTemplateHeaders.dataSource.read();
      };



      // Speichern
      $scope.OnGridMaintainTemplateSave = function () {
          $scope.OnRefSaveSaveFocus();

          // Ermittle Aktuelle Seite
          var actualMaintainTemplateHeadersPage = $scope.gridMaintainTemplateHeaders.pager.dataSource.page();

          // Daten zum speichern markieren (Header)
          var data = $scope.gridMaintainTemplateHeaders._data;
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
                  if ($scope.gridMaintainTemplateValue) {
                      var dataDatas = f_GetDataSourceMaintainTemplateValue(data[i])._data;
                      for (j = 0; j < dataDatas.length; j++) {
                          if (dataDatas[j].dirty) {
                              dataDatas[j]._Kendo_SaveIt = 1;
                          }; 
                      }
                  }

                  // Daten speichern (Detail)
                  $scope.gridMaintainTemplateValue(data[i]).dataSource.sync();
              }
          }

          // Daten speichern (Header)
          $scope.gridMaintainTemplateHeaders.dataSource.sync();

          // Seite wieder laden
          if (actualMaintainTemplateHeadersPage > 1) {

              // wieder auf Seite zurückspringen
              $scope.gridMaintainTemplateHeaders.pager.dataSource.page(actualMaintainTemplateHeadersPage);
          }

      };


      // Neue Zeile (Header) wurde hinzugefügt
      $scope.OnGridAddHeaderRow = function (e) {
          $scope.gridMaintainTemplateHeaders.addRow();

          // Mit Defaultwerten belegen
          var data = $scope.gridMaintainTemplateHeaders.dataSource.view();
          for (var i = 0; i < data.length; i++) {
              // nur neue Zeilen betrachten
              if (data[i].isNew()) {
                  // nur Zeilen betrachten deren InsertID noch nicht belegt sind
                  if (data[i].InsertID == undefined || data[i].InsertID == "") {
                      data[i].InsertID = new Date().getTime() + "." + new Date().getMilliseconds();
                  }
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
              var dataHeaderItem = $scope.gridMaintainTemplateHeaders.dataItem(detailHeaderRow.prev());

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

          // Daten löschen  
          grid.dataSource.sync();
      };

  }

]);

