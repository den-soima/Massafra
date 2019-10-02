// App: KendoTestConformance
var app = angular.module("KendoTestConformance", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: TestConformanceCtrl
app.controller("TestConformanceCtrl", ['$scope', '$interval', '$document', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsEnumerationTexts', 'refresh', 'kendoOdsUnits', 'kendoOdsMaterials',
function ($scope,$interval, $document, ngDialog, txt, kendoHelper, kendoOdsEnumerationTexts, refresh, kendoOdsUnits, kendoOdsMaterials) {

  // Konstanten                                                        
  const TIMEINTERVAL_PER_DAY_MS = 86400000;

  const TIMEOUT_DELAY_DATABOUND = 500;  // notwendig um doppeltes Aufrufen zu vermeiden

  var m_dataFilterValuesInitialized = undefined;
  var m_dataSourceFilterMaterialInitialized = false;
  var m_dataSourceFilterLineInitialized = false;
  var m_dataSourceFilterBatchInitialized = false;

  var m_dataSourceValuesInitialized = false;
  var m_dataValuesInitialized = false;

  var m_dataSourceTestConformance = new kendo.data.DataSource({
    type: "odata-v4",
    transport: {
      read: {
        url: $("#gatewayPath").data("value") + "odata/ods/ZWebTestConformances",
        datatype: 'json',
        beforeSend: function (xhr) {
          var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
          xhr.setRequestHeader("Authorization", auth);
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
          }
          return result;

          return result;
        }
      },
    },
    requestStart: function (e) {
      // Wenn noch nicht initialisiert, abbruch
      if (!m_dataValuesInitialized || !m_dataSourceValuesInitialized) {
        e.preventDefault();

        // Datenquelle wurde initialisiert
        m_dataSourceValuesInitialized = true;

      }
    },
    schema: {
      model: {
        id: "_Key",
        fields: {
          "_Key": { type: "number" },
          "VCName": { type: "string" },
          "_ValueCategoryKey": { type: "number" },

        }

      },


      parse: function (response) {

        var newValue = new Array();



        if (response.value.length > 0) {
          for (var i = 0; i < response.value.length; i++) {

            var VCPresent = false;

            for (var j = 0; j < newValue.length; j++) {
              if (newValue[j]._ValueCategoryKey == response.value[i]._ValueCategoryKey) {

                newValue[j].TotalCount = newValue[j].TotalCount + 1;
                newValue[j].NonNullCount = response.value[i]._ValueKey != null ? newValue[j].NonNullCount + 1 : newValue[j].NonNullCount,


                VCPresent = true;
                break;
              }
              

            }

            if (!VCPresent) {
              newValue.push({
                VCName: PCommonPortalMethods.GetSiteLanguage() == "en" ?  response.value[i].ValueCategoryGlobalName : response.value[i].ValueCategoryLocalName ,
                _ValueCategoryKey: response.value[i]._ValueCategoryKey,
                TotalCount: 1,
                NonNullCount: response.value[i]._ValueKey != null ? 1 : 0,
                Conformance: 0
              }
                )


            }




          }


          for (var j = 0; j < newValue.length; j++) {

            newValue[j].Conformance = newValue[j].NonNullCount / newValue[j].TotalCount ;

          }
        }

        response.value = newValue;


        return response;
      }
    },
    aggregate: [{ field: "TotalCount", aggregate: "sum" },
    { field: "NonNullCount", aggregate: "sum" },
     { field: "Conformance", aggregate: "average" }],

    batch: false,
    pageable: false,
    serverPaging: false,
    serverSorting: true,
    serverFiltering: true,
  });

  // DataSource für m_dataSourceFilterBatch
  var m_dataSourceFilterBatch = new kendo.data.DataSource({
    type: "odata-v4",
    transport: {
      read: {
        url: $("#gatewayPath").data("value") + "odata/ods/ZWebBrewBatches?$select=_Key,BatchName,StartTime,EndTime, _MaterialKey,_BatchTypeKey",
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
      if (!m_dataFilterValuesInitialized || !m_dataSourceFilterBatchInitialized) {
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
          "_BatchTypeKey": { type: "number" },
          //"Classifications": { field: "BatchType.Classifications", type: "string", parse: function (value) { return (value === undefined) ? ";;" : value; } },
        }
      }
    },
    batch: false,
    serverPaging: true,
    serverSorting: true,
    serverFiltering: true
  });


  // DataSource für m_dataSourceFilterLine
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
      if (!m_dataSourceFilterMaterialInitialized || !m_dataFilterValuesInitialized) {
        e.preventDefault();

        // Datenquelle wurde initialisiert
        m_dataSourceFilterMaterialInitialized = true;

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

  
  // DateTimePicker für Batchzeiten                                              
  $scope.dtTestConformanceEndTime = new Date();
  $scope.dtTestConformanceStartTime = new Date($scope.dtTestConformanceEndTime - 30 * TIMEINTERVAL_PER_DAY_MS);

    // Verweis auf Service      
  $scope.srv_kendoOdsEnumerationTexts = kendoOdsEnumerationTexts;

  $document.ready(function () {



    $scope.sFilterLine = undefined;
    $scope.sFilterMaterial = undefined;   
    $scope.cbFilter1stBatchValue = undefined;
    $scope.cbFilter2ndBatchValue = undefined;

    
    $("#selectFilterLine").data("kendo-multi-select").setDataSource(m_dataSourceFilterLine);
    $("#selectFilterLine").data("kendo-multi-select").bind("change", $scope.multiselect_change);
    $("#selectFilterMaterial").data("kendo-multi-select").setDataSource(m_dataSourceFilterMaterial);
    $("#selectFilterMaterial").data("kendo-multi-select").bind("change", $scope.multiselect_change);
    $("#comboBox1stFilterBatch").data("kendoComboBox").setDataSource(m_dataSourceFilterBatch);
    $("#comboBox2ndFilterBatch").data("kendoComboBox").setDataSource(m_dataSourceFilterBatch);

    
    kendoHelper.setDataSourceFilters(m_dataSourceFilterLine, "Classifications", "neq", ";;");
    
    kendoHelper.setDataSourceFilters(m_dataSourceFilterMaterial, "Classifications", "contains", ";MATERIALCLASS_WORT;");
    kendoHelper.setDataSourceSorts(m_dataSourceFilterMaterial, "MaterialName", "asc");
    kendoHelper.setDataSourceSorts(m_dataSourceFilterBatch, "BatchName", "asc");

    m_dataFilterValuesInitialized = true;

    m_dataSourceFilterBatch.read();
    m_dataSourceFilterLine.read();
    m_dataSourceFilterMaterial.read();

    $scope.OnFilterChanged();

  });

  $scope.OnLoadValues = function () {
    m_dataValuesInitialized = false;

    var AllFilters = new Array();

    if ($scope.sFilterMaterial != undefined) {
      var MaterialFilters = new Array();

      for (var i = 0; i < $scope.sFilterMaterial.length; i++) {
        MaterialFilters.push(
           {
             "field": "_MaterialKey",
             "operator": "eq",
             "value": $scope.sFilterMaterial[i]._Key
           }
          );
      }
      //kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "_MaterialKey", "eq", $scope.cbFilterMaterial._Key);
      AllFilters.push(
        {
          "logic": "or",
          "filters": MaterialFilters
        }
        );
    } else {
      var dlg = ngDialog.open({
        template: 'modalDialogNoMaterialSelectionTemplate',
        scope: $scope
      });

      return;
    }

    if ($scope.sFilterLine != undefined) {
      var LineFilters = new Array();

      for (var i = 0; i < $scope.sFilterLine.length; i++) {
        LineFilters.push(
           {
             "field": "_BatchTypeKey",
             "operator": "eq",
             "value": $scope.sFilterLine[i]._Key
           }
          );
      }
      //kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "_MaterialKey", "eq", $scope.cbFilterMaterial._Key);
      AllFilters.push(
        {
          "logic": "or",
          "filters": LineFilters
        }
        );
    }

    if ($scope.dtTestConformanceStartTime != undefined || $scope.dtTestConformanceEndTime != undefined) {
      AllFilters.push(
        {
          "logic": "and",
          "filters": [
             {
               "field": "StartTime",
               "operator": "gte",
               "value": $scope.dtTestConformanceStartTime
             },
             {
               "field": "StartTime",
               "operator": "lte",
               "value": $scope.dtTestConformanceEndTime
             }
          ]
        });
    }

    if ($scope.cbFilter1stBatchValue != undefined) {
      AllFilters.push(
       {
         "logic": "and",
         "filters": [
            {
              "field": "_BatchKey",
              "operator": "gte",
              "value": $scope.cbFilter1stBatchValue._Key
            }
         
         ]
       });
     
    }
    if ($scope.cbFilter2ndBatchValue != undefined) {
      AllFilters.push(
       {
         "logic": "and",
         "filters": [
            {
              "field": "_BatchKey",
              "operator": "lte",
              "value": $scope.cbFilter2ndBatchValue._Key
            }

         ]
       });
    }

    m_dataSourceTestConformance.filter(AllFilters);

    m_dataValuesInitialized = true;

    $scope.gridTestConformances.dataSource = m_dataSourceTestConformance;
    $scope.gridTestConformances.dataSource.read();


  };

  // ----------------------------------------
  // Defaultwerte für Filtereinstellungen

  $scope.sFilterMaterial = undefined;
  $scope.sFilterLine = undefined;

  

  // ----------------------------------------
  // Optionen für selectFilterMaterial
  $scope.selectFilterMaterial = {
    dataTextField: "MaterialName",
    dataValueField: "_Key",
    placeholder: "Select materials...",
    
    change: function () {
      $scope.OnFilterChanged();        
    }

  };

  // ----------------------------------------
  // Optionen für selectFilterLine
  $scope.selectFilterLine = {
    dataTextField: "BatchTypeName",
    dataValueField: "_Key",
    placeholder: "Select lines...",
    tagMode: "single",

    change: function () {
      $scope.OnFilterChanged();
    }

  };

  // ----------------------------------------
  // Optionen für comboBoxFilterUnit
  $scope.comboBox1stFilterBatch = {
    dataTextField: "BatchName",
    dataValueField: "_Key",
    filter: "contains",
    minLength: 3,
    delay: 200

  };

  // ----------------------------------------
  // Optionen für comboBoxFilterUnit
  $scope.comboBox2ndFilterBatch = {
    dataTextField: "BatchName",
    dataValueField: "_Key",
    filter: "contains",
    minLength: 3,
    delay: 200

  };


  // ----------------------------------------
  // Optionen für dateTimePickerStart
  $scope.dateTimePickerTestConformanceStartTime = {
    change: function () {
      $scope.OnFilterChanged();
    }
  };

  // Optionen für dateTimePickerStop 
  $scope.dateTimePickerTestConformanceEndTime = {
    change: function () {
      $scope.OnFilterChanged();
    }
  };



  

  $scope.OnFilterChanged = function () {
    // DataSource für m_ColumnNames

    // Sperren
    m_dataFilterValuesInitialized = false;

    var AllFilters = new Array();

    if ($scope.sFilterMaterial != undefined) {
      var MaterialFilters = new Array();

      for (var i = 0; i < $scope.sFilterMaterial.length; i++) {
        MaterialFilters.push(
           {
             "field": "_MaterialKey",
             "operator": "eq",
             "value": $scope.sFilterMaterial[i]._Key
           }
          );
      }
      //kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "_MaterialKey", "eq", $scope.cbFilterMaterial._Key);
      AllFilters.push(
        {
          "logic": "or",
          "filters": MaterialFilters
        }
        );
    }

    if ($scope.sFilterLine != undefined) {
      var LineFilters = new Array();

      for (var i = 0; i < $scope.sFilterLine.length; i++) {
        LineFilters.push(
           {
             "field": "_BatchTypeKey",
             "operator": "eq",
             "value": $scope.sFilterLine[i]._Key
           }
          );
      }
      //kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "_MaterialKey", "eq", $scope.cbFilterMaterial._Key);
      AllFilters.push(
        {
          "logic": "or",
          "filters": LineFilters
        }
        );
    }

    if ($scope.dtTestConformanceStartTime != undefined || $scope.dtTestConformanceEndTime != undefined) {
      AllFilters.push(
        {
          "logic": "and",
          "filters":[
             {
               "field":"StartTime",
               "operator":"gte",
               "value": $scope.dtTestConformanceStartTime},
             {
               "field":"StartTime",
               "operator":"lte",
               "value":$scope.dtTestConformanceEndTime}
          ]});
        
       
    }

    m_dataSourceFilterBatch.filter(AllFilters);

    // Werte initialisiert
    m_dataFilterValuesInitialized = true;

    // Datenquelle zuweisen
    $scope.comboBox1stFilterBatch.dataSource = m_dataSourceFilterBatch;
    $scope.comboBox2ndFilterBatch.dataSource = m_dataSourceFilterBatch;

    // Datenquelle lesen
    $scope.comboBox1stFilterBatch.dataSource.read();
    $scope.comboBox2ndFilterBatch.dataSource.read();
 

   



  }

  $scope.multiselect_change = function (e) {
    e.sender.tagList.find('> li').sort(function (a, b) {
      return $(a).text() > $(b).text();
    }).appendTo(e.sender.tagList);
  };

  // Optionen für Grid TestConformances
  $scope.gridTestConformances = {
    // toolbar: ["pdf", "excel"],       // disabled due to bug in kendo ui 2015 
   
    dataSource: m_dataSourceTestConformance,

    // columnMenu: true,
    columns: [{
      field: "VCName",
      title: txt.TXT_VARIABLE,
      footerTemplate: '<div style="">Total</div>',
    
    }, {
      field: "TotalCount",
      title: txt.TXT_TOTAL,
      width: "10%",
      attributes: { style: "text-align:center;" },
      headerAttributes: { style: "text-align:center;" },
      footerTemplate: '<div style="text-align: center">#= sum # </div>',
    },{
    field: "NonNullCount",
    title: txt.TXT_TESTED,
  width: "10%",
  attributes: { style: "text-align:center;" },
  headerAttributes: { style: "text-align:center;" },
  footerTemplate: '<div style="text-align: center">#= sum # </div>',
    } ,{
      field: "Conformance",
      title: txt.TXT_CONFORMANCE,
      width: "10%",
      attributes: { style: "text-align:center;" },
      headerAttributes: { style: "text-align:center;" },
      footerTemplate: '<div style="text-align: center">#= kendo.toString(average  , "p0") # </div>',
  template: function (dataItem) {
    
    return kendo.toString(dataItem.Conformance , "p0") ;
    
  },

}]
  };

}
]);