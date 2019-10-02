// App: KendoMaintaindrillInTemplate
var app = angular.module("KendoMaintainDrillInTemplate", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: MaintainDrillInTemplateCtrl
app.controller("MaintainDrillInTemplateCtrl", ['$document', '$scope', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsMaterials', 'kendoOdsValueCategory', 'kendoOdsEnumerationTexts', 'refresh',
  function ($document, $scope, ngDialog, txt, kendoHelper, kendoOdsMaterials, kendoOdsValueCategory, kendoOdsEnumerationTexts, refresh) {



    // Konstanten

    const EDITABLE_FIELDS_UPDATE_MTH = ['TemplateName'];
    const EDITABLE_FIELDS_UPDATE_MTV = ['Position', 'ValueCategory'];
    const EDITABLE_FIELDS_CREATE_MTH = ['TemplateName'];
    const EDITABLE_FIELDS_CREATE_MTV = ['Position', 'ValueCategory'];

    const TIMEOUT_DELAY_DATABOUND = 500;  // notwendig um doppeltes Aufrufen zu vermeiden

    $scope.FTRHeaderKey = $("#FTRHeaderKey").data("value");
    $scope.ConfigKey = $("#ConfigKey").data("value");


    // Struktur: dataSourceElement   
    function c_dataSourceElement(dataItem, dataSource) {
      this.dataItem = dataItem;
      this.dataSource = dataSource;
    };


    // interne Variablen                       
    var m_dataSourceMaintainDrillInTemplateValueElements = new Array();  // Array mit allen datasource Elementen die in Grid MaintainTemplateDaeta bereits gelesen wurden    
    var m_selectedtabStripMaintainDrillInTemplateHeaders = [];
    var m_pdfExportRunning = false;

    var m_dataValuesInitialized = false;
    var m_dataSourceMaintainDrillInTemplateInitialized = false;


    // Aktualisieren      
    var m_expandedRows = undefined;
    var m_selectedRows = undefined;

    var m_timeoutMaintainDrillInTemplateHeaderHandle = null;
    var m_timeoutMaintainDrillInTemplateValueHandle = new Array();

    //Datenquelle HEader
   var m_FTRHeadersDS =  new kendo.data.DataSource({

      type: "odata-v4",
      transport: {
        read: {
          url: function () {
            
            return $("#gatewayPath").data("value") + "odata/ods/ZFTRHeaders";
          },

          datatype: 'json',
          beforeSend: function (x) {
            var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
            x.setRequestHeader("Authorization", auth);
          },
          cache: false
        },
        parameterMap: function (data, operation) {
          if (operation === "read") {
            var dataToRead = data;

            // Filteranpassungen vor Abfrageerstellung
            if (dataToRead.filter && dataToRead.filter.filters) {
              if (dataToRead.filter.filters.length <= 0)
                dataToRead.filter = undefined;
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
            "_Key": { type: "number", editable: false },
            "FTRLocalName": { type: "string" },
            "FTRGlobalName": { type: "string" },
            "FTRName": { type: "string" },
          }
        },
        parse: function (response) {
          var values = response.value,
              n = values.length,
              i = 0,
              value;
          for (; i < n; i++) {
            value = values[i];
            value.FTRName =
            PCommonPortalMethods.GetSiteLanguage() == "en" ? value.FTRGlobalName : value.FTRLocalName;
          }

          $scope.FTRHeaderName = values[0].FTRName;

          return response;
        }

      },
      batch: false,
      serverPaging: false,
      serverSorting: true,
      serverFiltering: true

   });

   var m_ParameterDS = new kendo.data.DataSource({

     type: "odata-v4",
    
     transport: {
       read: {
         url: function () {

           return $("#gatewayPath").data("value") + "odata/ods/ZFTRConfigurations?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)";
         },

         datatype: 'json',
         beforeSend: function (x) {
           var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
           x.setRequestHeader("Authorization", auth);
         },
         cache: false
       },
       parameterMap: function (data, operation) {
         if (operation === "read") {
           var dataToRead = data;

           // Filteranpassungen vor Abfrageerstellung
           if (dataToRead.filter && dataToRead.filter.filters) {
             if (dataToRead.filter.filters.length <= 0)
               dataToRead.filter = undefined;
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
           "_Key": { type: "number", editable: false },
           "ValueCategoryLocalName": { field: "ValueCategory.ValueCategoryLocalName", type: "string" },
           "ValueCategoryGlobalName": { field: "ValueCategory.ValueCategoryGlobalName", type: "string" },
           "ValueCategoryName": { type: "string" },
         }
       },
       parse: function (response) {
         var values = response.value,
             n = values.length,
             i = 0,
             value;
         for (; i < n; i++) {
           value = values[i];
           value.ValueCategoryName =
           PCommonPortalMethods.GetSiteLanguage() == "en" ? value.ValueCategory.ValueCategoryGlobalName : value.ValueCategory.ValueCategoryLocalName;
         }

         $scope.ParameterName = values[0].ValueCategoryName;

         return response;
       }

     },
     batch: false,
     serverPaging: false,
     serverSorting: true,
     serverFiltering: true

   });


    // -------------------------
    // Datenquelle des Grids: MaintainDrillInTemplateHeader
    var m_dataSourceMaintainDrillInTemplateHeaders = new kendo.data.DataSource({
      type: "odata-v4",
      error: function (e) {
        for (var i = 0; i < e.sender._data.length; i++) {
          if (e.sender._data[i].dirty) {
            $scope.OnGridMaintainDrillInTemplateRefresh();
            return;
          }
        }
      },
      transport: {
        read: {
          url: $("#gatewayPath").data("value") + "odata/ods/ZFTRConfigurations?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)",
          datatype: 'json',
          beforeSend: function (x) {
            var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
            x.setRequestHeader("Authorization", auth);
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
                      ((!data._FTRHeaderKey || data._FTRHeaderKey == null) ? '' : ',"_FTRHeaderKey": ' + '"' + data._FTRHeaderKey + '"') +
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
                        ((!!data._FTRHeaderKey) ? ',"_FTRHeaderKey": "' + data._FTRHeaderKey : 0) + '"' +
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
        if (!m_dataValuesInitialized || !m_dataSourceMaintainDrillInTemplateInitialized) {
          e.preventDefault();

          // Datenquelle wurde initialisiert
          m_dataSourceMaintainDrillInTemplateInitialized = true;

        }
      },

      schema: {
        model: {
          id: "_Key",
          fields: {
            "_Key": { type: "number" },
            "_FTRHeaderKey": { type: "number" },
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
      pageSize: 10,
      serverPaging: true,
      serverSorting: true,
      serverFiltering: true
    });

    $scope.dataSourceKendoOdsValueCategory = kendoOdsValueCategory.getDataSource;

    // -------------------------
    // Datenquelle des Grids: MaintainDrillInTemplateValue (Hilfsfunktion)
    // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
    var f_GetDataSourceMaintainDrillInTemplateValue = function (dataItem) {
      if (!m_dataSourceMaintainDrillInTemplateValueElements)
        m_dataSourceMaintainDrillInTemplateValueElements = new Array();
      // wenn gefunden, entsprechendes Element zurückgeben
      for (var i = 0; i < m_dataSourceMaintainDrillInTemplateValueElements.length; i++) {

        if (m_dataSourceMaintainDrillInTemplateValueElements[i].dataItem._Key == dataItem._Key)
          return m_dataSourceMaintainDrillInTemplateValueElements[i].dataSource;

        else if (!!m_dataSourceMaintainDrillInTemplateValueElements[i].dataItem.InsertID && !!dataItem.InsertID) {
          if (m_dataSourceMaintainDrillInTemplateValueElements[i].dataItem.InsertID == dataItem.InsertID)
            return m_dataSourceMaintainDrillInTemplateValueElements[i].dataSource;
        }
      }
      // Element anlegen
      var newElement = new c_dataSourceElement(dataItem, f_GetDataSourceMaintainDrillInTemplateValueElement());

      // Filter/Sortierung setzen
      if (!!dataItem._Key && !isNaN(dataItem._Key))
        kendoHelper.setDataSourceFilters(newElement.dataSource, "_SelfReferenceKey", "eq", parseInt(dataItem._Key));


      // Sortierung setzen
      //       kendoHelper.setDataSourceSorts(newElement.dataSource, "Line", "desc");

      // Element hinzufügen
      m_dataSourceMaintainDrillInTemplateValueElements.push(newElement);
      return newElement.dataSource;
    };

    // Datenquelle des Grids: MaintainDrillInTemplateValue 

    var f_GetDataSourceMaintainDrillInTemplateValueElement = function () {
      return new kendo.data.DataSource({
        type: "odata-v4",
        error: function (e) {
          for (var i = 0; i < e.sender._data.length; i++) {
            if (e.sender._data[i].dirty) {
              $scope.OnGridMaintainDrillInTemplateRefresh();
              return;
            }
          }
        },
        transport: {
          read: {
            url: $("#gatewayPath").data("value") + "odata/ods/ZFTRConfigurations?$expand=ValueCategory($select=_Key,ValueCategoryLocalName,ValueCategoryGlobalName)",
            datatype: 'json',
            beforeSend: function (x) {
              var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
              x.setRequestHeader("Authorization", auth);
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
                        ((!data._FTRHeaderKey || data._FTRHeaderKey == null) ? '' : ',"_FTRHeaderKey": ' + '"' + data._FTRHeaderKey + '"') +
                        ',"_SelfReferenceKey": "' + data._SelfReferenceKey +'"' +
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
                          ((!!data._FTRHeaderKey) ? ',"_FTRHeaderKey": "' + data._FTRHeaderKey : 0) + '"' +
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
              "_FTRHeaderKey": { type: "number" },
              "_SelfReferenceKey": { type: "number" },
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
        pageSize: 10,
        serverPaging: true,
        serverSorting: true,
        serverFiltering: true
      });
    };

    // ----------------------------------------
    // Init Header
    $scope.OnInitMaintainDrillInTemplateHeaders = function () {

      $scope.ParameterName = "";
      $scope.FTRHeaderName = "";

      if ($scope.FTRHeaderKey != "") {
        kendoHelper.setDataSourceFilters(m_dataSourceMaintainDrillInTemplateHeaders, "_FTRHeaderKey", "eq", $scope.FTRHeaderKey); // eq Kendo Operator 
        kendoHelper.setDataSourceFilters(m_FTRHeadersDS, "_Key", "eq", $scope.FTRHeaderKey); // eq Kendo Operator
        m_FTRHeadersDS.read();
      }
      if ($scope.ConfigKey != "") {
          kendoHelper.setDataSourceFilters(m_ParameterDS, "_Key", "eq", $scope.ConfigKey); // eq Kendo Operator 
          kendoHelper.setDataSourceFilters(m_dataSourceMaintainDrillInTemplateHeaders, "_SelfReferenceKey", "eq", $scope.ConfigKey); // eq Kendo Operator 
          m_ParameterDS.read();
      }
      else {
        $scope.ParameterName = "-"
        kendoHelper.setDataSourceFilters(m_dataSourceMaintainDrillInTemplateHeaders, "_SelfReferenceKey", "eq", "null"); // eq Kendo Operator 

        for (var i = 0; i < m_dataSourceMaintainDrillInTemplateHeaders._filter.filters.length; i++) {
          if (m_dataSourceMaintainDrillInTemplateHeaders._filter.filters[i].field == "_SelfReferenceKey") {
            m_dataSourceMaintainDrillInTemplateHeaders._filter.filters[i].value = null;
          }

        }


        
      }

     
     

        // Sortierung setzen
        kendoHelper.setDataSourceSorts(m_dataSourceMaintainDrillInTemplateHeaders, "Created", "desc");

        // Datenquellen erstmalig initialisieren
        m_dataSourceMaintainDrillInTemplateHeaders.read();

      // Werte initialisiert
        m_dataValuesInitialized = true;

        // Datenquelle zuweisen
        $scope.gridMaintainDrillInTemplateHeaders.dataSource = m_dataSourceMaintainDrillInTemplateHeaders;

        // Datenquelle lesen
        $scope.gridMaintainDrillInTemplateHeaders.dataSource.read();



      };

      // ----------------------------------------




      // Optionen für Grid MaintainTemplateHeader
      $scope.gridMaintainDrillInTemplateHeaders = {
        // toolbar: ["pdf", "excel"],       // disabled due to bug in kendo ui 2015 
       
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
  if (m_timeoutMaintainDrillInTemplateHeaderHandle != null) {
      // ggf. laufenden Timeout stoppen
      clearTimeout(m_timeoutMaintainDrillInTemplateHeaderHandle);

      // zurücksetzen
      m_timeoutMaintainDrillInTemplateHeaderHandle = null;
    }

    if (m_timeoutMaintainDrillInTemplateHeaderHandle == null) {

      // Timeout starten
      m_timeoutMaintainDrillInTemplateHeaderHandle = setTimeout(function (grid) {

        // Timeout abgelaufen
        m_timeoutMaintainDrillInTemplateHeaderHandle = null;

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
          var dataHeaderItem = $scope.gridMaintainDrillInTemplateHeaders.dataItem(detailHeaderRow.prev());

          // Defaultwerte anlegen
          if (e.model.isNew()) {
            if (!e.model._FTRHeaderKey) {
              e.model._FTRHeaderKey = dataHeaderItem._Key;
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
          field: "",
          attributes: {
            style: "text-align: center;"
          },
          title: txt.TXT_CREATE,
          width: "14.1%",
          template:
              function (dataItem) {
                  return '<a href="MaintainDrillInTemplate?ConfigKey=' + dataItem._Key.toString() + '&FTRHeaderKey=' + $scope.FTRHeaderKey + '" target="_self" class="k-button drillIn">' + txt.TXT_CONFIGURE_DRILL_IN + '</a>';
              },
          filterable: false
        },

        {
          field: "Command",
          title: " ",
          attributes: {
            style: "text-align: center;"
          },
          template: '<kendo-button class="button-small button-delete button" style="min-width:20px;" ng-click="OnGridMaintainDrillInTemplateRemoveRow($event)"></kendo-button>',
          filterable: false
        }]
      };


      // Optionen für Grid MaintainTemplateValue        
      $scope.gridMaintainDrillInTemplateValue = function (dataItem) {
        return {
          dataSource: f_GetDataSourceMaintainDrillInTemplateValue(dataItem),
          toolbar: [{
            template: '<button class="k-button k-button-icontext" ng-click="OnGridAddValueRow($event)"><span class="k-icon k-add"></span> ' + txt.TXT_INSERT_NEW_LINE + '</button>'
          }],
          dataBound: function (e) {

            // über Timeout setzen, da Kendo mehrmals dataBound aufruft und so Verschaltungen mehrmals passieren
            // dadurch entsteht Speicherverschmiss
            if (m_timeoutMaintainDrillInTemplateValueHandle[dataItem.id] != null) {
              // ggf. laufenden Timeout stoppen
              clearTimeout(m_timeoutMaintainDrillInTemplateValueHandle[dataItem.id]);

              // zurücksetzen
              m_timeoutMaintainDrillInTemplateValueHandle[dataItem.id] = null;
            }

            if (m_timeoutMaintainDrillInTemplateValueHandle[dataItem.id] == null) {

              // Timeout starten
              m_timeoutMaintainDrillInTemplateValueHandle[dataItem.id] = setTimeout(function (grid) {

                // Timeout abgelaufen
                m_timeoutMaintainDrillInTemplateValueHandle[dataItem.id] = null;

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
            var dataHeaderItem = $scope.gridMaintainDrillInTemplateHeaders.dataItem(detailHeaderRow.prev());

            // Defaultwerte anlegen
            if (e.model.isNew()) {
              if (!e.model._FTRHeaderKey) {
                e.model._FTRHeaderKey = dataHeaderItem._FTRHeaderKey;

              }
              if (!e.model._SelfReferenceKey) {
                e.model._SelfReferenceKey = dataHeaderItem._Key;
              }
              if (!e.model.HeaderInsertID) {
                e.model.HeaderInsertID = dataHeaderItem.HeaderInsertID;
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
            template: '<kendo-button class="button-small button-delete button" style="min-width:20px;" ng-click="OnGridMaintainDrillInTemplateRemoveRow($event)"></kendo-button>',
            filterable: false
          }]
        };
      };


      function TemplateEditor(container, options) {
        if (PCommonPortalMethods.GetSiteLanguage() == 'en') {
          var input = $('<input type="text" class="k-input k-textbox" name="TemplateGlobalName" data-bind="value:TemplateGlobalName">');
          input.appendTo(container);
        }
        else {
          var input = $('<input type="text" class="k-input k-textbox" name="TemplateLocalName" data-bind="value:TemplateLocalName">');
          input.appendTo(container);
        }
      };


      $scope.OnRefSaveSaveFocus = function () {
        // Selektierte & expandierte Zeilen merken
        var grid = $scope.gridMaintainDrillInTemplateHeaders;
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

      };


      // Refresh/Cancel
      $scope.OnGridMaintainDrillInTemplateRefresh = function () {
        $scope.OnRefSaveSaveFocus();

        // Init
        if (!m_dataValuesInitialized || !m_dataSourceMaintainDrillInTemplateInitialized)
          return;

        // Request sperren
        m_dataValuesInitialized = false;

        if ($scope.FTRHeaderKey != "") {
          kendoHelper.setDataSourceFilters(m_dataSourceMaintainDrillInTemplateHeaders, "_FTRHeaderKey", "eq", $scope.FTRHeaderKey); // eq Kendo Operator 
          kendoHelper.setDataSourceFilters(m_dataSourceMaintainDrillInTemplateHeaders, "_SelfReferenceKey", "eq", "null"); // eq Kendo Operator 
          m_dataSourceMaintainDrillInTemplateHeaders._filter.filters[1].value = null;
        }
        if ($scope.ConfigKey != "") {
          {
            kendoHelper.setDataSourceFilters(m_dataSourceMaintainDrillInTemplateHeaders, "_SelfReferenceKey", "eq", $scope.ConfigKey); // eq Kendo Operator 
          }

          // Sortierung setzen                                                              
          kendoHelper.setDataSourceSorts(m_dataSourceMaintainDrillInTemplateHeaders, "Created", "desc");

          // Request entsperren
          m_dataValuesInitialized = true;

          // Daten lesen  
          $scope.gridMaintainDrillInTemplateHeaders.dataSource.read();
        }
      };



      // Speichern
      $scope.OnGridMaintainDrillInTemplateSave = function () {
        $scope.OnRefSaveSaveFocus();

        // Ermittle Aktuelle Seite
        var actualMaintainTemplateHeadersPage = $scope.gridMaintainDrillInTemplateHeaders.pager.dataSource.page();

        // Daten zum speichern markieren (Header)
        var data = $scope.gridMaintainDrillInTemplateHeaders._data;
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
            if ($scope.gridMaintainDrillInTemplateValue) {
              var dataDatas = f_GetDataSourceMaintainDrillInTemplateValue(data[i])._data;
              for (j = 0; j < dataDatas.length; j++) {
                if (dataDatas[j].dirty) {
                  dataDatas[j]._Kendo_SaveIt = 1;
                };
              }
            }

            // Daten speichern (Detail)
            $scope.gridMaintainDrillInTemplateValue(data[i]).dataSource.sync();
          }
        }

        // Daten speichern (Header)
        $scope.gridMaintainDrillInTemplateHeaders.dataSource.sync();

        // Seite wieder laden
        if (actualMaintainTemplateHeadersPage > 1) {

          // wieder auf Seite zurückspringen
          $scope.gridMaintainDrillInTemplateHeaders.pager.dataSource.page(actualMaintainTemplateHeadersPage);
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
        var dataHeaderItem = $scope.gridMaintainDrillInTemplateHeaders.dataItem(detailHeaderRow.prev());

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
      $scope.OnGridMaintainDrillInTemplateRemoveRow = function (e) {
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

