// App: KendoMaintainFTRTemplate
var app = angular.module("KendoMaintainFTRTemplate", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: MaintainFTRTemplateCtrl
app.controller("MaintainFTRTemplateCtrl", ['$document', '$scope', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsMaterials', 'kendoOdsValueCategory', 'kendoOdsEnumerationTexts', 'refresh',
  function ($document, $scope, ngDialog, txt, kendoHelper, kendoOdsMaterials, kendoOdsValueCategory, kendoOdsEnumerationTexts, refresh) {



      // Konstanten

      const EDITABLE_FIELDS_UPDATE_MTH = ['FTRName'];
      const EDITABLE_FIELDS_UPDATE_MTV = ['Position', 'ValueCategory'];        
      const EDITABLE_FIELDS_CREATE_MTH = ['FTRName'];
      const EDITABLE_FIELDS_CREATE_MTV = ['Position', 'ValueCategory'];


      const TIMEOUT_DELAY_DATABOUND = 500;  // notwendig um doppeltes Aufrufen zu vermeiden


      // Struktur: dataSourceElement   
      function c_dataSourceElement(dataItem, dataSource) {
          this.dataItem = dataItem;
          this.dataSource = dataSource;
      };


      // interne Variablen                       
      var m_dataSourceMaintainFTRTemplateValueElements = new Array();  // Array mit allen datasource Elementen die in Grid bereits gelesen wurden    
      var m_selectedtabStripMaintainFTRTemplateHeaders = [];
      var m_pdfExportRunning = false;

      var m_dataValuesInitialized = false;
      var m_dataSourceMaintainFTRTemplateInitialized = false;
      var m_DataElementInitialized = false;


      // Aktualisieren      
      var m_expandedRows = undefined;
      var m_selectedRows = undefined;

      var m_timeoutMaintainFTRTemplateHeaderHandle = null;
      var m_timeoutMaintainFTRTemplateValueHandle = new Array();


      // -------------------------
      // Datenquelle des Grids: MaintainFTRTemplateHeader
      var m_dataSourceMaintainFTRTemplateHeaders = new kendo.data.DataSource({
        type: "odata-v4",
        error: function (e) {
          for (var i = 0; i < e.sender._data.length; i++) {
            if (e.sender._data[i].dirty)
            {
              $scope.OnGridMaintainFTRTemplateRefresh();
              return;
            }
          }
        },

          transport: {          
              read: {
                url: $("#gatewayPath").data("value") + "odata/ods/ZFTRHeaders",
                  datatype: 'json',
                  beforeSend: function (x) {
                      var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                      x.setRequestHeader("Authorization", auth);
                  },
                  cache: false
              },
              create: {
                  url: function (data) {
                    return $("#gatewayPath").data("value") + "odata/ods/ZFTRHeaders";
                  },
                  dataType: "json",
                  type: "POST",
                  beforeSend: function (x) {
                    $scope.OnRefSaveSaveFocus();

                      var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                      x.setRequestHeader("Authorization", auth);
                  }
              },

              update: {
                  url: function (data) {
                    return $("#gatewayPath").data("value") + "odata/ods/ZFTRHeaders(" + data._Key + ")";

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
                    return $("#gatewayPath").data("value") + "odata/ods/ZFTRHeaders(" + data._Key + ")";
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
                                  '","CreatedUser": "' + $("#portalUser").data("value") + '"' +
                                    ',"FTRGlobalName": "' + ((!!data.FTRGlobalName) ? data.FTRGlobalName : data.FTRLocalName) + '"' +
                                    ',"FTRLocalName": "' + ((!!data.FTRLocalName) ? data.FTRLocalName : data.FTRGlobalName) +
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
                                    ((!!data.FTRGlobalName) ? ',"FTRGlobalName": "' + data.FTRGlobalName : data.FTRLocalName) + '"' +
                                    ((!!data.FTRLocalName) ? ',"FTRLocalName": "' + data.FTRLocalName : data.FTRGlobalName) +
                                  '"}';
                      }
                  }

                  if (operation === "read") {

                      var dataToRead = data;




                      // Filteranpassungen vor Abfrageerstellung
                      if (dataToRead.filter && dataToRead.filter.filters) {
                          for (var i = 0; i < dataToRead.filter.filters.length; i++) {
                              if (dataToRead.filter.filters[i].field == "FTRName" && PCommonPortalMethods.GetSiteLanguage() != "en")
                                dataToRead.filter.filters[i].field = "FTRLocalName";
                              if (dataToRead.filter.filters[i].field == "FTRName" && PCommonPortalMethods.GetSiteLanguage() == "en")
                                dataToRead.filter.filters[i].field = "FTRGlobalName";
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
              if (!m_dataValuesInitialized || !m_dataSourceMaintainFTRTemplateInitialized) {
                  e.preventDefault();

                  // Datenquelle wurde initialisiert
                  m_dataSourceMaintainFTRTemplateInitialized = true;

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
                      "FTRName": { type: "string", parse: function (value) { return value || {} } },
                      "FTRGlobalName": { type: "string" },
                      "FTRLocalName": { type: "string" },            
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
      // Datenquelle des Grids: MaintainFTRTemplateValue (Hilfsfunktion)
      // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
      var f_GetDataSourceMaintainFTRTemplateValue = function (dataItem) {
          if (!m_dataSourceMaintainFTRTemplateValueElements)
              m_dataSourceMaintainFTRTemplateValueElements = new Array();
          // wenn gefunden, entsprechendes Element zurückgeben
          for (var i = 0; i < m_dataSourceMaintainFTRTemplateValueElements.length; i++) {
  
              if (m_dataSourceMaintainFTRTemplateValueElements[i].dataItem._Key == dataItem._Key)
                return m_dataSourceMaintainFTRTemplateValueElements[i].dataSource;
              
              else if (!!m_dataSourceMaintainFTRTemplateValueElements[i].dataItem.InsertID && !!dataItem.InsertID) {
                if (m_dataSourceMaintainFTRTemplateValueElements[i].dataItem.InsertID == dataItem.InsertID)
                  return m_dataSourceMaintainFTRTemplateValueElements[i].dataSource;
              }
          }

          m_DataElementInitialized = false;

          // Element anlegen
          var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceMaintainFTRTemplateValueElement());

          // Filter/Sortierung setzen
          if (!!dataItem._Key && !isNaN(dataItem._Key))
            kendoHelper.setDataSourceFilters(newElement.dataSource, "_FTRHeaderKey", "eq", parseInt(dataItem._Key));
          else
              kendoHelper.setDataSourceFilters(newElement.dataSource, "HeaderInsertID", "eq", dataItem.InsertID);

          kendoHelper.setDataSourceFilters(newElement.dataSource, "_SelfReferenceKey", "eq", "null"); // eq Kendo Operator 
          for (var i = 0; i < newElement.dataSource._filter.filters.length; i++) {
            if (newElement.dataSource._filter.filters[i].field == "_SelfReferenceKey") {
              newElement.dataSource._filter.filters[i].value = null;
            }

          }

          m_DataElementInitialized = true;


          // Element hinzufügen
          m_dataSourceMaintainFTRTemplateValueElements.push(newElement);
          return newElement.dataSource;
      };

    // Datenquelle des Grids: MaintainFTRTemplateValue 

      var f_GetDataSourceMaintainFTRTemplateValueElement = function () {
          return new kendo.data.DataSource({
            type: "odata-v4",
            error: function (e) {
              for (var i = 0; i < e.sender._data.length; i++) {
                if (e.sender._data[i].dirty) {
                  $scope.OnGridMaintainFTRTemplateRefresh();
                  return;
                }
              }
            },
              transport: {
                  read: {
                    url: $("#gatewayPath").data("value") + "odata/ods/ZFTRConfigurations?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)",

                      datatype: 'json',
                      beforeSend: function (xhr) {
                          var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                          xhr.setRequestHeader("Authorization", auth);
                      },
                      cache: false
                  },
                  create: {
                      url: function (data) {
                        return $("#gatewayPath").data("value") + "odata/ods/ZFTRConfigurations?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)";
                      },
                      dataType: "json",
                      type: "POST",
                      beforeSend: function (x) {
                        $scope.OnRefSaveSaveFocus();

                          var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                          x.setRequestHeader("Authorization", auth);
                      }
                  },
                  update: {
                      url: function (data) {
                        return $("#gatewayPath").data("value") + "odata/ods/ZFTRConfigurations(" + data._Key + ")?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)";
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
                        return $("#gatewayPath").data("value") + "odata/ods/ZFTRConfigurations(" + data._Key + ")?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)";
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
                          var str = '{ "Created": "' + kendoHelper.getUTCDate(new Date()) +
                                    '", "Position": "' + data.Position +
                                    '","LastModified": "' + kendoHelper.getUTCDate(new Date()) + 
                                    ((data.ValueCategory._Key) ? '","_ValueCategoryKey": "' + data.ValueCategory._Key : "") + '"' +
                                    ',"HeaderInsertID": "' + ((data.HeaderInsertID) ? data.HeaderInsertID : "") + '"' +
                                    ((!data._FTRHEaderKey || data._FTRHEaderKey == null) ? '' : ',"_FTRHeaderKey": ' + '"' + data._FTRHEaderKey + '"') +
                                 '}';

                           return str;

                      }
                      else if (operation === "update") {
                          if (data._Kendo_SaveIt == 1) {
                              data._Kendo_SaveIt = 0;
                              return '{ "_Key": "' + data._Key +
                                        '", "Position": "' + data.Position +
                                        '","Created": "' + kendoHelper.getUTCDate(new Date(data.Created)) +
                                        '","LastModified": "' + kendoHelper.getUTCDate(new Date()) + 
                                        ((data.ValueCategory._Key) ? '","_ValueCategoryKey": "' + data.ValueCategory._Key : "") + '"' +
                                        ((!!data.HeaderInsertID) ? ',"HeaderInsertID": "' + data.HeaderInsertID : 0) + '"' +
                                        ((!!data._FTRHEaderKey) ? ',"_FTRHEaderKey": "' + data._FTRHEaderKey : 0) + '"' +
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
              requestStart: function (e) {
                // Wenn noch nicht initialisiert, abbruch
                if (!m_DataElementInitialized) {
                  e.preventDefault();

                  // Datenquelle wurde initialisiert
                  //m_dataSourceMaintainFTRTemplateInitialized = true;

                }
              },
              schema: {
                  model: {
                      id: "_Key",
                      fields: {
                          "_Key": { type: "number" },
                          "_FTRHEaderKey": { type: "number" },
                          "Position": { type: "number" },
                          "Created": { type: "date" },                     
                          "LastModified": { type: "date" },
                          "ValueCategory": { field: "ValueCategory", type: "string", parse: function (value) { return value || {} } },      
                          "ValueCategoryLocalName": { field: "ValueCategory.ValueCategoryLocalName", type: "string" },
                          "ValueCategoryGlobalName": { field: "ValueCategory.ValueCategoryGlobalName", type: "string" },
                          "Command": { type: "string", parse: function (value) { return 0; } },
                          "_Kendo_SaveIt": { type: "number", defaultValue: 0, parse: function (value) { return 0; } },
                          "HeaderInsertID": { type: "string", defaultValue: "" },
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

   
      // ----------------------------------------
      // Init Header
      $scope.OnInitMaintainFTRTemplateHeaders = function () {  

          // Sortierung setzen
          kendoHelper.setDataSourceSorts(m_dataSourceMaintainFTRTemplateHeaders, "Created", "desc");


          // Datenquellen erstmalig initialisieren
          m_dataSourceMaintainFTRTemplateHeaders.read();


          // Werte initialisiert
          m_dataValuesInitialized = true;

          // Datenquelle zuweisen
          $scope.gridMaintainFTRTemplateHeaders.dataSource = m_dataSourceMaintainFTRTemplateHeaders;

          // Datenquelle lesen
          $scope.gridMaintainFTRTemplateHeaders.dataSource.read();

      };

      // ----------------------------------------




    // Optionen für Grid MaintainFTRTemplateHeader
      $scope.gridMaintainFTRTemplateHeaders = {
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
                $scope.OnGridMaintainFTRTemplateRefresh();
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

                  //for (var i = 0; i < gridData.length; i++) {
                  //    if (!!gridData[i]._EnumerationLink)
                  //        kendoOdsEnumerationTexts.init(gridData[i]._EnumerationLink);
                  //}

                  // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                  // dadurch entsteht Speicherverschmiss
                  if (m_timeoutMaintainFTRTemplateHeaderHandle != null) {
                      // ggf. laufenden Timeout stoppen
                    clearTimeout(m_timeoutMaintainFTRTemplateHeaderHandle);

                      // zurücksetzen
                    m_timeoutMaintainFTRTemplateHeaderHandle = null;
                  }

                  if (m_timeoutMaintainFTRTemplateHeaderHandle == null) {

                      // Timeout starten
                    m_timeoutMaintainFTRTemplateHeaderHandle = setTimeout(function (grid) {

                          // Timeout abgelaufen
                      m_timeoutMaintainFTRTemplateHeaderHandle = null;

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
                  field: "FTRName",
                  title: txt.TXT_FTR_TEMPLATE_NAME,
                  editor: TemplateEditor,
                  template: function (data) {
                      if (PCommonPortalMethods.GetSiteLanguage() === 'en') {
                          if (data.FTRGlobalName != null) {
                            return data.FTRGlobalName;
                          }
                          return data.FTRLocalName;
                      } else {
                        if (data.FTRLocalName != null) {
                          return data.FTRLocalName;
                          } 
                          return data.FTRGlobalName;
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
              },
               {
                 field: "",
                 attributes: {
                   style: "text-align: center;"
                 },
                 title: txt.TXT_CREATE,
                 width: "14.1%",
                 template:
                     function (dataItem) {

                       return '<a href="MaintainDrillInTemplate?FTRHeaderKey='+ dataItem._Key.toString() +'" target="_blank" class="k-button drillIn">'+ txt.TXT_CONFIGURE_DRILL_IN +'</a>';

                     },
                 filterable: false
               }, {
                  field: "Command",
                  title: " ",
                  attributes: {
                      style: "text-align: center;"
                  },
                  template: '<kendo-button class="button-small button-delete button" style="min-width:20px;" ng-click="OnGridMaintainFTRTemplateRemoveRow($event)"></kendo-button>',
                  filterable: false
              }
              ]
      };

      // Datenquelle für Unit/Material/ValueCategory
     // $scope.dataSourceKendoOdsMaterials = kendoOdsMaterials.getDataSource;
      $scope.dataSourceKendoOdsValueCategory = kendoOdsValueCategory.getDataSource;
      //$scope.dataSourceEnumerationTexts = kendoOdsEnumerationTexts.getDataSource;


    // Optionen für Grid MaintainFTRTemplateValue        
      $scope.gridMaintainFTRTemplateValue = function (dataItem) {
          return  {
            dataSource: f_GetDataSourceMaintainFTRTemplateValue(dataItem),
              toolbar: [{
                  template: '<button class="k-button k-button-icontext" ng-click="OnGridAddValueRow($event)"><span class="k-icon k-add"></span> ' + txt.TXT_INSERT_NEW_LINE + '</button>'
              }], 
              dataBound: function (e) {

                  // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
                  // dadurch entsteht Speicherverschmiss
                if (m_timeoutMaintainFTRTemplateValueHandle[dataItem.id] != null) {
                      // ggf. laufenden Timeout stoppen
                  clearTimeout(m_timeoutMaintainFTRTemplateValueHandle[dataItem.id]);

                      // zurücksetzen
                  m_timeoutMaintainFTRTemplateValueHandle[dataItem.id] = null;
                  }

                if (m_timeoutMaintainFTRTemplateValueHandle[dataItem.id] == null) {

                      // Timeout starten
                  m_timeoutMaintainFTRTemplateValueHandle[dataItem.id] = setTimeout(function (grid) {

                          // Timeout abgelaufen
                    m_timeoutMaintainFTRTemplateValueHandle[dataItem.id] = null;

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
                  var dataHeaderItem = $scope.gridMaintainFTRTemplateHeaders.dataItem(detailHeaderRow.prev());

                  // Defaultwerte anlegen
                 if (e.model.isNew()) {
                     if (!e.model._FTRHEaderKey) {
                       e.model._FTRHEaderKey = dataHeaderItem._Key;
                 //        e.model.TemplateInsertID = 0;

                      }  
                      if (!e.model.ValueCategoryLocalName || !(typeof e.model.ValueCategory === 'object')) {
                          e.model.ValueCategory = { _Key: "81200000000", "ValueCategoryLocalName": "Unknown", "ValueCategoryGlobalName": "Unknown" };
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
              },
             

              {
                  field: "Command",
                  title: " ",
                  attributes: {
                      style: "text-align: center;"
                  },
                  template: '<kendo-button class="button-small button-delete button" style="min-width:20px;" ng-click="OnGridMaintainFTRTemplateRemoveRow($event)"></kendo-button>',
                  filterable: false
              }]
          };
      };



      function TemplateEditor(container, options) {
          if(PCommonPortalMethods.GetSiteLanguage() == 'en') {
            var input = $('<input type="text" class="k-input k-textbox" name="FTRGlobalName" data-bind="value:FTRGlobalName">');
              input.appendTo(container);
          }
          else {
            var input = $('<input type="text" class="k-input k-textbox" name="FTRLocalName" data-bind="value:FTRLocalName">');
                  input.appendTo(container);
          }
      }


      $scope.OnRefSaveSaveFocus = function () {
          // Selektierte & expandierte Zeilen merken
        var grid = $scope.gridMaintainFTRTemplateHeaders;
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
      $scope.OnGridMaintainFTRTemplateRefresh = function () {
          $scope.OnRefSaveSaveFocus();

          // Template Initialisieren     
     

          // Init
          if (!m_dataValuesInitialized || !m_dataSourceMaintainFTRTemplateInitialized)
              return;

          // Request sperren
          m_dataValuesInitialized = false;   


          // Sortierung setzen                                                              
          kendoHelper.setDataSourceSorts(m_dataSourceMaintainFTRTemplateHeaders, "Created", "desc");

          // Request entsperren
          m_dataValuesInitialized = true;

          // Daten lesen  
          $scope.gridMaintainFTRTemplateHeaders.dataSource.read();
      };



      // Speichern
      $scope.OnGridMaintainFTRTemplateSave = function () {
          $scope.OnRefSaveSaveFocus();

          // Ermittle Aktuelle Seite
          var actualMaintainFTRTemplateHeadersPage = $scope.gridMaintainFTRTemplateHeaders.pager.dataSource.page();

          // Daten zum speichern markieren (Header)
          var data = $scope.gridMaintainFTRTemplateHeaders._data;
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
                  if ($scope.gridMaintainFTRTemplateValue) {
                      var dataDatas = f_GetDataSourceMaintainFTRTemplateValue(data[i])._data;
                      for (j = 0; j < dataDatas.length; j++) {
                          if (dataDatas[j].dirty) {
                              dataDatas[j]._Kendo_SaveIt = 1;
                          }; 
                      }
                  }

                try {
                  // Daten speichern (Detail)
                  $scope.gridMaintainFTRTemplateValue(data[i]).dataSource.sync();
                } catch (e) {

                }
                 
              }
          }

        try {
          // Daten speichern (Header)
          $scope.gridMaintainFTRTemplateHeaders.dataSource.sync();
          
        } catch (e) {

        }

          // Seite wieder laden
          if (actualMaintainFTRTemplateHeadersPage > 1) {

              // wieder auf Seite zurückspringen
            $scope.gridMaintainFTRTemplateHeaders.pager.dataSource.page(actualMaintainFTRTemplateHeadersPage);
          }

      };


      // Neue Zeile (Header) wurde hinzugefügt
      $scope.OnGridAddHeaderRow = function (e) {
        $scope.gridMaintainFTRTemplateHeaders.addRow();

          // Mit Defaultwerten belegen
        var data = $scope.gridMaintainFTRTemplateHeaders.dataSource.view();
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
              var dataHeaderItem = $scope.gridMaintainFTRTemplateHeaders.dataItem(detailHeaderRow.prev());

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
                      if (data[i].HeaderInsertID == undefined || data[i].HeaderInsertID == "") {
                        data[i].HeaderInsertID = dataHeaderItem.InsertID;
                      }
                      if (data[i]._FTRHEaderKey == undefined || data[i]._FTRHEaderKey == "") {
                        data[i]._FTRHEaderKey = dataHeaderItem._Key;
                      }
                  }
              }
          };



      // Zeile zum löschen markieren
      $scope.OnGridMaintainFTRTemplateRemoveRow = function (e) {
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

