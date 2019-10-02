
var app = angular.module("KendoDataExport", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: DataExportCtrl_Navigation
app.controller("DataExport_Ctrl", ['$document', '$scope', 'txt', 'kendoHelper', 'kendoOdsMaterials',
    function ($document, $scope, txt, kendoHelper, kendoOdsMaterials) {


       

      // Konstanten
      const TIMEINTERVAL_PER_DAY_MS = 86400000;
      const TIMEOUT_DELAY_READ_FILTER_BATCH = 200;          

      // interne Variablen
      var m_dataValuesInitialized = false;
      var m_dataSourceFilterBatchInitialized = false;
      var m_dataSourceFilterLineInitialized = false;
      var m_dataSourceFilterTemplateInitialized = false;
      var m_dataSourceFilterMaterialInitialized = false;

      var m_dataFilterValuesInitialized = false;

      // interne Variablen
      // DataSource für m_dataSourceFilterTemplate
      var m_dataSourceFilterTemplate = new kendo.data.DataSource({

        type: "odata-v4",
        transport: {
          read: {
            url: function () {
              if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                return $("#gatewayPath").data("value") + "odata/ods/ZTemplates?$select=_Key,_Name,TemplateGlobalName,_UsageEnumerationTextLink";
              }
              else {
                return $("#gatewayPath").data("value") + "odata/ods/ZTemplates?$select=_Key,_Name,TemplateLocalName,_UsageEnumerationTextLink";
              }
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

              // Abfrageerstellung ausführen
              var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
              result.$count = true;
              delete result.$inlinecount;        

              return result;
            }
          },
        },
        requestStart: function (e) {
          // Wenn noch nicht initialisiert, abbruch
          if (!m_dataValuesInitialized || !m_dataSourceFilterTemplateInitialized) {
            e.preventDefault();

            // Datenquelle wurde initialisiert
            m_dataSourceFilterTemplateInitialized = true;

          }
        },
        schema: {
          model: {
            id: "_Key",
            fields: {
              "_Key": { type: "number", editable: false },
              "_Name": { type: "string", editable: false },
              "TemplateLocalName": { field: "TemplateLocalName", type: "string", editable: false, parse: function (value) { return value || {}; } },
              "TemplateGlobalName": { field: "TemplateGlobalName", type: "string", editable: false, parse: function (value) { return value || {}; } },
              "_UsageEnumerationTextLink": { type: "string", editable: false },
            }
          }
        },
        batch: false,
        serverPaging: true,
        serverSorting: true,
        serverFiltering: true
      });

      // DataSource für m_dataSourceFilterBatch
      var m_dataSourceFilterBatch = new kendo.data.DataSource({
        type: "odata-v4",
        transport: {
          read: {
            url: $("#gatewayPath").data("value") + "odata/ods/ZWebBrewBatches?$select=_Key,BatchName,StartTime,EndTime, _MaterialKey",
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

              // Abfrageerstellung ausführen
              var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
              result.$count = true;
              delete result.$inlinecount;

              // Filteranpassungen nach Abfrageerstellung
              if (result.$filter) {
                  result.$filter = result.$filter.replace(/StartTime/g, "cast(StartTime, Edm.DateTimeOffset)");
                  result.$filter = result.$filter.replace(/EndTime/g, "cast(EndTime, Edm.DateTimeOffset)");
              }
              else {
                result.$filter = "1 eq 1";
              }

              return result;
            }
          },
        },     
        requestStart: function (e) {
          // Wenn noch nicht initialisiert, abbruch
          if (!m_dataValuesInitialized || !m_dataSourceFilterBatchInitialized) {
            e.preventDefault();

            // Datenquelle wurde initialisiert
            m_dataSourceFilterBatchInitialized = true;

          }
        },      
        schema: {
          model: {
            id: "_Key",
            fields: {
              "_Key": { type: "number" },
              "BatchName": { type: "string", parse: function (value) { return value || {}; } },
              "StartTime": { type: "date" },
              "EndTime": { type: "date" },
              "_MaterialKey": { type: "number" },
              //"Classifications": { field: "BatchType.Classifications", type: "string", parse: function (value) { return (value === undefined) ? "" : value; } },
            }
          }
        },
        batch: false,
        serverPaging: true,
        serverSorting: true,
        serverFiltering: true
      });



        // DataSource für dataSourceFilterLine
      var m_dataSourceFilterLine = new kendo.data.DataSource({

          type: "odata-v4",
          transport: {
              read: {
                  url: $("#gatewayPath").data("value") + "odata/ods/BatchTypes?$select=_Key,BatchTypeGlobalName,BatchTypeLocalName,Classifications",

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

                      // Abfrageerstellung ausführen
                      var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
                      result.$count = true;
                      delete result.$inlinecount;

                      return result;
                  }
              },
          },
          requestStart: function (e) {
              // Wenn noch nicht initialisiert, abbruch
              if (!m_dataSourceFilterLineInitialized || !m_dataFilterValuesInitialized) {
                  e.preventDefault();

                  // Datenquelle wurde initialisiert
                  m_dataSourceFilterLineInitialized = true;

              }
          },
          schema: {
              model: {
                  id: "_Key",
                  fields: {
                      "_Key": { type: "number" },
                      "BatchTypeGlobalName": { type: "string" },
                      "BatchTypeLocalName": { type: "string" },
                      "BatchTypeName": { type: "string" },
                      "Classifications": { type: "string" },
                  }
              },

              parse: function (response) {
                  var values = response.value,
                      n = values.length,
                      i = 0,
                      value;
                  for (; i < n; i++) {
                      value = values[i];
                      value.BatchTypeName =
                      PCommonPortalMethods.GetSiteLanguage() == "en" ? value.BatchTypeGlobalName : value.BatchTypeLocalName;
                  }

                  return response;
              }
          },
          batch: false,
          serverPaging: true,
          serverSorting: true,
          serverFiltering: true
      });

        // DataSource für m_dataSourceFilterMaterial
      var m_dataSourceFilterMaterial = new kendo.data.DataSource({

          type: "odata-v4",
          transport: {
              read: {
                  url: $("#gatewayPath").data("value") + "odata/ods/Materials?$expand=MaterialClass($select=Classifications)&$select=_Key,MaterialGlobalName,MaterialLocalName",

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

                      // Abfrageerstellung ausführen
                      var result = kendo.data.transports.odata.parameterMap(dataToRead, operation, true);
                      result.$count = true;
                      delete result.$inlinecount;

                      return result;
                  }
              },
          },
          requestStart: function (e) {
              // Wenn noch nicht initialisiert, abbruch
              if (!m_dataSourceFilterLineInitialized || !m_dataFilterValuesInitialized) {
                  e.preventDefault();

                  // Datenquelle wurde initialisiert
                  m_dataSourceFilterLineInitialized = true;

              }
          },
          schema: {
              model: {
                  id: "_Key",
                  fields: {
                      "_Key": { type: "number" },
                      "MaterialGlobalName": { type: "string" },
                      "MaterialLocalName": { type: "string" },
                      "MaterialName": { type: "string" },
                      "Classifications": { field: "MaterialClass.Classifications", type: "string", parse: function (value) { return (value === undefined) ? "" : value; } },
                  }
              },

              parse: function (response) {
                  var values = response.value,
                      n = values.length,
                      i = 0,
                      value;
                  for (; i < n; i++) {
                      value = values[i];
                      value.MaterialName =
                      PCommonPortalMethods.GetSiteLanguage() == "en" ? value.MaterialGlobalName : value.MaterialLocalName;
                  }

                  return response;
              }
          },
          batch: false,
          serverPaging: true,
          serverSorting: true,
          serverFiltering: true
      });


      // DateTimePicker für CreationTime                                              
      $scope.dtDataExportStopValue = new Date();
      $scope.dtDataExportStartValue = new Date($scope.dtDataExportStopValue - 28 * TIMEINTERVAL_PER_DAY_MS);  


      $document.ready(function () {
          m_dataFilterValuesInitialized = false;
          $scope.cbFilter1stBatchValue = undefined;
          $scope.cbFilter2ndBatchValue = undefined;
          $scope.cbFilterTemplateValue = undefined;
          $scope.cbFilterMaterialValue = undefined;
          $scope.cbFilterLineValue = undefined;

          $("#comboBoxFilterTemplate").data("kendoComboBox").setDataSource(m_dataSourceFilterTemplate);
          $("#comboBox1stFilterBatch").data("kendoComboBox").setDataSource(m_dataSourceFilterBatch);
          $("#comboBox2ndFilterBatch").data("kendoComboBox").setDataSource(m_dataSourceFilterBatch);
          $("#comboBoxFilterLine").data("kendoComboBox").setDataSource(m_dataSourceFilterLine);
          $("#comboBoxFilterMaterial").data("kendoComboBox").setDataSource(m_dataSourceFilterMaterial);
          
            
          kendoHelper.setDataSourceFilters(m_dataSourceFilterTemplate, "_UsageEnumerationTextLink", "eq", "*[Template Type].1*");
          kendoHelper.setDataSourceFilters(m_dataSourceFilterLine, "Classifications", "neq", ";;");
          kendoHelper.setDataSourceFilters(m_dataSourceFilterMaterial, "Classifications", "contains", ";MATERIALCLASS_WORT;");
          //kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "Classifications", "neq", ";;");
          kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "StartTime", "gte", new Date($scope.dtDataExportStopValue - 28 * TIMEINTERVAL_PER_DAY_MS));
          kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "StartTime", "lte", new Date());


          m_dataFilterValuesInitialized = true;

          m_dataSourceFilterTemplate.read();
          //m_dataSourceFilterBatch.read();
          m_dataSourceFilterLine.read();
          m_dataSourceFilterMaterial.read();

      });


      // ----------------------------------------
      // Defaultwerte für Filtereinstellungen
      $scope.cbFilter1stBatchValue = undefined;
      $scope.cbFilter2ndBatchValue = undefined;
      $scope.cbFilterTemplateValue = undefined;
      $scope.cbFilterMaterialValue = undefined;
      $scope.cbFilterLineValue = undefined;

      // ----------------------------------------
      // Optionen für comboBoxFilterTemplate
      $scope.comboBoxFilterTemplate = {
        dataTextField: "TemplateGlobalName",      // todo local name
        dataValueField: "_Key",
        filter: "contains",
        minLength: 2,
        delay: 200,
        placeholder: txt.TXT_INPUT_TEMPLATE + "...",
      };


      // ----------------------------------------
      // Optionen für comboBox1stFilterBatch
      $scope.comboBox1stFilterBatch = {
        dataTextField: "BatchName",   
        dataValueField: "_Key",
        filter: "contains",
        minLength: 8,
        delay: 200,
        placeholder: txt.TXT_INPUT_BATCH + "...",

        change: function () {
          $scope.OnFilterChanged();       // TODO
        },
      };

      // ----------------------------------------
        // Optionen für comboBox2ndFilterBatch
      $scope.comboBox2ndFilterBatch = {
          dataTextField: "BatchName",
        dataValueField: "_Key",
        filter: "contains",
        minLength: 8,
        delay: 200,
              placeholder: txt.TXT_INPUT_BATCH + "...",
        change: function () {
            $scope.OnFilterChanged();          // TODO
        },
      };

        // ----------------------------------------
        // Optionen für comboBoxFilterLine
      $scope.comboBoxFilterLine = {
          dataTextField: "BatchTypeName",
          dataValueField: "_Key",
          filter: "contains",
          minLength: 3,
          delay: 200,
          placeholder: txt.TXT_INPUT_LINE + "...",
          change: function () {
              $scope.OnFilterChanged();        // TODO
          }
      };

        // ----------------------------------------
        // Optionen für comboBoxFilterMaterial
      $scope.comboBoxFilterMaterial = {
          dataTextField: "MaterialName",
          dataValueField: "_Key",
          filter: "contains",
          minLength: 3,
          delay: 200,
          placeholder: txt.TXT_INPUT_MATERIAL + "...",
          change: function () {
              $scope.OnFilterChanged();        // TODO
          }
      };



    // ----------------------------------------
    // Optionen für dateTimePickerProcessProductionScheduleHeadersStart
    $scope.dateTimePickerDataExportStart = {
        change: function () {
            $scope.OnFilterChanged();
        }
    };

    // Optionen für dateTimePickerProcessProductionScheduleHeadersStop 
    $scope.dateTimePickerDataExportStop = {
        change: function () {
            $scope.OnFilterChanged();
        }
    };
         
        
        //Rebind flag setzten (Bool, dann kann eifach mit true und false getriggert werden)
    $scope.doRebind = false;

        //$scope.gridFTRValues = $scope.GetGridFTRValuesOptions();

        // FilterLine delete
    $scope.OnFilterChanged = function () {
        // DataSource für m_ColumnNames

            // Sperren
            m_dataValuesInitialized = false;
            // Filter setzen
 /*         kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "BatchName", "eq", $scope.cbFilter1stBatchValue);
            kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "BatchName", "eq", $scope.cbFilter2ndBatchValue);
 */

           
            if ($scope.cbFilterMaterialValue != undefined) {
                kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "_MaterialKey", "eq", $scope.cbFilterMaterialValue._Key);
            }               

            if ($scope.cbFilterLineValue != undefined) {
                kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "_BatchTypeKey", "eq", $scope.cbFilterLineValue._Key);
            }     

            if ($scope.dtDataExportStartValue != undefined || $scope.dtDataExportStopValue != undefined) {
                kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "StartTime", "gte", $scope.dtDataExportStartValue);
                kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "StartTime", "lte", $scope.dtDataExportStopValue);

                // Werte initialisiert
                m_dataValuesInitialized = true;

                // Datenquelle zuweisen
                $scope.comboBox1stFilterBatch.dataSource = m_dataSourceFilterBatch;
                $scope.comboBox2ndFilterBatch.dataSource = m_dataSourceFilterBatch;

                // Datenquelle lesen
               $scope.comboBox1stFilterBatch.dataSource.read();
               $scope.comboBox2ndFilterBatch.dataSource.read();
            }

/*
        //// Filter Einstellungen wurden geaendert
        //    $scope.OnFilterChanged = function () {
            var values = {
                dtFilterStartValue: $scope.dtDataExportStartValue,
                dtFilterStopValue: $scope.dtDataExportStopValue,
                cbFilter1stBatchValue: $scope.cbFilter1stBatchValue,
                cbFilterLineValue: $scope.cbFilterLineValue,
                cbFilterTemplateValue: $scope.cbFilterTemplateValue,
                cbFilterMaterialValue: $scope.cbFilterMaterialValue,
                cbFilterDisplayClosedLotsValue: $scope.checkBoxDisplayClosedLotsValue
            }

        //    //Refresh Broadcast zu Parent
            $scope.$emit('OnFilterChanged', values);       // Meldung zum ParentController (DataExport) - OnFilterChanged        
        //}
        */
    }

      


    // ----------------------------------------
    // Init
    $scope.OnInitDataExport = function () {


      // Sortierung setzen
      kendoHelper.setDataSourceSorts(m_dataSourceFilterBatch, "BatchName", "asc");
      if (PCommonPortalMethods.GetSiteLanguage() == 'en')  
        kendoHelper.setDataSourceSorts(m_dataSourceFilterTemplate, "TemplateGlobalName", "asc");
      else
        kendoHelper.setDataSourceSorts(m_dataSourceFilterTemplate, "TemplateLocalName", "asc");

      // ComboBox spezifische Einstellungen
      if (PCommonPortalMethods.GetSiteLanguage() != 'en')
        $scope.comboBoxFilterTemplate.dataTextField = "TemplateLocalName";


      kendoHelper.setDataSourceSorts(m_dataSourceFilterBatch, "BatchName", "asc");


      // Werte initialisiert
      m_dataValuesInitialized = true;

        // Datenquelle zuweisen 
      $scope.comboBoxFilterTemplate.dataSource = m_dataSourceFilterTemplate;
      $scope.comboBox1stFilterBatch.dataSource = m_dataSourceFilterBatch;
      $scope.comboBox2ndFilterBatch.dataSource = m_dataSourceFilterBatch;
      $scope.comboBoxFilterMaterial.dataSource = m_dataSourceFilterMaterial;
      $scope.comboBoxFilterLine.dataSource = m_dataSourceFilterLine;

      // Datenquelle lesen
     // m_dataSourceFilterBatch.read();
      m_dataSourceFilterTemplate.read();
      m_dataSourceFilterMaterial.read();
      m_dataSourceFilterLine.read();

    };


    // Reset
    $scope.OnReset = function () {

      $scope.cbFilter1stBatchValue = undefined;
      $scope.cbFilter2ndBatchValue = undefined;
      $scope.cbFilterTemplateValue = undefined;
      $scope.cbFilterLineValue = undefined;
      $scope.cbFilterMaterialValue = undefined;
      $scope.dtDataExportStartValue = undefined;
      $scope.dtDataExportStopValue = undefined;

      $scope.$apply();
    }

    // Export
    $scope.OnExport = function () {

      var url = "DataExport/DownloadBatchOverviewReport";

      // Parameter ermitteln
      var parameters = "";
      parameters += "&_TemplateKey=" + ((!$scope.cbFilterTemplateValue) ? "" : $scope.cbFilterTemplateValue._Key);
      parameters += "&_1stBatchKey=" + ((!$scope.cbFilter1stBatchValue) ? "" : $scope.cbFilter1stBatchValue._Key);
      parameters += "&_2ndBatchKey=" + ((!$scope.cbFilter2ndBatchValue) ? "" : $scope.cbFilter2ndBatchValue._Key);
      parameters += "&_BatchTypeKey=" + ((!$scope.cbFilterLineValue) ? "" : $scope.cbFilterLineValue._Key);
      parameters += "&_MaterialKey=" + ((!$scope.cbFilterMaterialValue) ? "" : $scope.cbFilterMaterialValue._Key);
                              
      parameters += "&StartTime=" + ((!$scope.dtDataExportStartValue) ? "" : kendoHelper.getDateCSharp($scope.dtDataExportStartValue));
      parameters += "&EndTime=" + ((!$scope.dtDataExportStopValue) ? "" : kendoHelper.getDateCSharp($scope.dtDataExportStopValue));
      parameters += "&CreateLogFile=false";
      if (parameters != "")
        url += "?" + parameters;

      // URL oeffnen
      window.open(url, '_self', false)
    }

    $scope.OnExportNEW = function () {

      var url = "DataExport/DownloadBatchOverviewReport_NEW";

      // Parameter ermitteln
      var parameters = "";
      parameters += "&_TemplateKey=" + ((!$scope.cbFilterTemplateValue) ? "" : $scope.cbFilterTemplateValue._Key);
      parameters += "&_1stBatchKey=" + ((!$scope.cbFilter1stBatchValue) ? "" : $scope.cbFilter1stBatchValue._Key);
      parameters += "&_2ndBatchKey=" + ((!$scope.cbFilter2ndBatchValue) ? "" : $scope.cbFilter2ndBatchValue._Key);
      parameters += "&_BatchTypeKey=" + ((!$scope.cbFilterLineValue) ? "" : $scope.cbFilterLineValue._Key);
      parameters += "&_MaterialKey=" + ((!$scope.cbFilterMaterialValue) ? "" : $scope.cbFilterMaterialValue._Key);

      parameters += "&StartTime=" + ((!$scope.dtDataExportStartValue) ? "" : kendoHelper.getDateCSharp($scope.dtDataExportStartValue));
      parameters += "&EndTime=" + ((!$scope.dtDataExportStopValue) ? "" : kendoHelper.getDateCSharp($scope.dtDataExportStopValue));

      if (parameters != "")
        url += "?" + parameters;

      // URL oeffnen
      window.open(url, '_self', false)
    }
}
]);