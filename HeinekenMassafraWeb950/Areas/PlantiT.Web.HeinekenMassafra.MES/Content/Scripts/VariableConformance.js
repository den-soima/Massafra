// App: KendoVariableConformance
var app = angular.module("KendoVariableConformance", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"])

// Controller: VariableConformanceCtrl
app.controller("VariableConformanceCtrl", ['$scope', '$interval', '$document', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsEnumerationTexts', 'refresh', 'kendoOdsUnits', 'kendoOdsMaterials', '$anchorScroll', '$location',
function ($scope, $interval, $document, ngDialog, txt, kendoHelper, kendoOdsEnumerationTexts, refresh, kendoOdsUnits, kendoOdsMaterials, $anchorScroll, $location) {


// Konstanten                                                        
const TIMEINTERVAL_PER_DAY_MS = 86400000;

var m_dataFilterValuesInitialized = undefined;
var m_dataSourceFilterMaterialInitialized = false;
var m_dataSourceFilterLineInitialized = false;
var m_dataSourceFilterBatchInitialized = false;

var m_dataSourceValuesInitialized = false;
var m_dataValuesInitialized = false;

$scope.colMaterialValues = new Array();

$scope.scrollTo = function (id) {
    $location.hash(id);
    console.log($location.hash());
    $anchorScroll();
};

$(document).ready(function () {
    // Show or hide the sticky footer button
    $("#mainGrid").scroll(function () {
        if ($(this).scrollTop() > 200) {
            $('.go-top').fadeIn(200);
        } else {
            $('.go-top').fadeOut(200);
        }
    });

        // Animate the scroll to top
    $('.go-top').click(function (event) {
        event.preventDefault();
        $('#mainGrid').animate({ scrollTop: 0 }, 300);
    })
});


  // DataSource für Werte
  var m_dataSourceValues = new kendo.data.DataSource({
    type: "odata-v4",
    change: function (data) {
      $scope.ValuesLoaded(data);
    },
    transport: {
      read: {
        url: $("#gatewayPath").data("value") + "odata/ods/ZWebVariableConformances",
        datatype: 'json',
        beforeSend: function (x) {
          var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
          x.setRequestHeader("Authorization", auth);
        },
        cache: false,
        
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
            result.$filter = result.$filter.replace(/RecordingTime/g, "cast(RecordingTime, Edm.DateTimeOffset)");
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
  $scope.dtVariableConformanceEndTime = new Date();
  $scope.dtVariableConformanceStartTime = new Date($scope.dtVariableConformanceEndTime - 30 * TIMEINTERVAL_PER_DAY_MS);

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
      
    // Sperren
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

      AllFilters.push(
        {
          "logic": "or",
          "filters": LineFilters
        }
        );
    }

    if ($scope.dtVariableConformanceStartTime != undefined || $scope.dtVariableConformanceEndTime != undefined) {
      AllFilters.push(
        {
          "logic": "and",
          "filters": [
             {
               "field": "RecordingTime",
               "operator": "gte",
               "value": $scope.dtVariableConformanceStartTime
             },
             {
               "field": "RecordingTime",
               "operator": "lte",
               "value": $scope.dtVariableConformanceEndTime
             }
          ]
        });
    }
      if ($scope.cbFilter1stBatchValue != undefined || $scope.cbFilter2ndBatchValue != undefined) {
        AllFilters.push(
          {
            "logic": "and",
            "filters": [
               {
                 "field": "_BatchKey",
                 "operator": "gte",
                 "value": $scope.cbFilter1stBatchValue._Key != undefined ? $scope.cbFilter1stBatchValue._Key : $scope.cbFilter2ndBatchValue._Key,
               },
               {
                 "field": "_BatchKey",
                 "operator": "lte",
                 "value": $scope.cbFilter2ndBatchValue._Key != undefined ? $scope.cbFilter2ndBatchValue._Key : $scope.cbFilter1stBatchValue._Key,
               }
            ]
          });
      }

  

    m_dataSourceValues.filter(AllFilters);

    // Werte initialisiert
    m_dataValuesInitialized = true;

   
    m_dataSourceValues.read();


  

    //$scope.colMaterialValues

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

    //change: function () {
    //  $scope.OnFilterChanged();
    //}

  };


    // ----------------------------------------
    // Optionen für selectFilterMaterial
  $scope.selectFilterMaterialscroll = {
      dataTextField: "MaterialName",
      dataValueField: "_Key",
      placeholder: "Jump to material...",
      select: function (e) {
          $scope.scrollTo(e.item[0].innerHTML)
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
  $scope.dateTimePickerVariableConformanceStartTime = {
    change: function () {
      $scope.OnFilterChanged();
    }
  };

  // Optionen für dateTimePickerStop 
  $scope.dateTimePickerVariableConformanceEndTime = {
    change: function () {
      $scope.OnFilterChanged();
    }
  };



  

  $scope.OnFilterChanged = function () {

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
     
      AllFilters.push(
        {
          "logic": "or",
          "filters": LineFilters
        }
        );
    }

    if ($scope.dtVariableConformanceStartTime != undefined || $scope.dtVariableConformanceEndTime != undefined) {
      AllFilters.push(
        {
          "logic": "and",
          "filters": [
             {
               "field": "StartTime",
               "operator": "gte",
               "value": $scope.dtVariableConformanceStartTime
             },
             {
               "field": "StartTime",
               "operator": "lte",
               "value": $scope.dtVariableConformanceEndTime
             }
          ]
        });


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

  $scope.On1stFilterBatchDelete = function () {
    $scope.cbFilter1stBatchValue = undefined;

  }

  $scope.On2ndFilterBatchDelete = function () {
    $scope.cbFilter2ndBatchValue = undefined;

  }

  $scope.multiselect_change = function (e) {
    e.sender.tagList.find('> li').sort(function (a, b) {
      return $(a).text() > $(b).text();
    }).appendTo(e.sender.tagList);
  };

  $scope.ValuesLoaded = function (data)
  {
    $scope.colMaterialValues = new Array();

    var CalculatedData = new Array();

    for (var i = 0; i < data.items.length; i++) {

      for (var j = 0; j < m_dataSourceFilterMaterial.data().length; j++) {
        if (data.items[i]._MaterialKey == m_dataSourceFilterMaterial.data()[j]._Key) {
           
          var matPresent = $.grep($scope.colMaterialValues, function (e) { return e._MaterialKey == data.items[i]._MaterialKey; });

          if (matPresent.length === 0) {
            $scope.colMaterialValues.push(
              {
                _MaterialKey: data.items[i]._MaterialKey,
                MaterialName: m_dataSourceFilterMaterial.data()[j].MaterialName,
                VCs: new Array(),
                Grid: undefined
              });
          }

          var matObject = $.grep($scope.colMaterialValues, function (e) { return e._MaterialKey == data.items[i]._MaterialKey; });

          var vcPresent = $.grep(matObject[0].VCs, function (e) { return e._ValueCategoryKey == data.items[i]._ValueCategoryKey; });

          if (vcPresent.length === 0) {
            matObject[0].VCs.push(
              {
                _ValueCategoryKey: data.items[i]._ValueCategoryKey,
                ValueCategoryName: PCommonPortalMethods.GetSiteLanguage() == "en" ? data.items[i].ValueCategoryGlobalName : data.items[i].ValueCategoryLocalName,
                SortOrder: data.items[i].SortOrder,
                Data:
                {
                  Values: [data.items[i].Value],
                  LL: [data.items[i].LowerLimit],
                  UL: [data.items[i].UpperLimit],
                  LVL: [data.items[i].LowerVetoLimit],
                  UVL: [data.items[i].UpperVetoLimit],
                  SP: [data.items[i].SetpointValueRunning],
                  Average: "0",
                  Std: "0",
                  Min: "0",
                  Max: "0",
                  RejectLowVal:     "0",
                  RejectLowPerc:    "0",
                  WarningLowVal:    "0",
                  WarningLowPerc:   "0",
                  TargetVal:        "0",
                  TargetPerc:       "0",
                  WarningUpVal:     "0",
                  WarningUpPerc:    "0",
                  RejectUpVal:      "0",
                  RejectUpPerc: "0",
                  CpK: "0",
                  CpKOOS: 0,
                  Stds: "0",
                  StdsPerc: "0",
                  Stdt: "0",
                  StdtPerc: "0",
                  Total: "0",
                  Tested: "0",
                  Rejected: "0"
                }
                
              });
          }
          else {
            vcPresent[0].Data.Values.push(data.items[i].Value);
            vcPresent[0].Data.LL.push(data.items[i].LowerLimit);
            vcPresent[0].Data.UL.push(data.items[i].UpperLimit);
            vcPresent[0].Data.LVL.push(data.items[i].LowerVetoLimit);
            vcPresent[0].Data.UVL.push(data.items[i].UpperVetoLimit);
            vcPresent[0].Data.SP.push(data.items[i].SetpointValueRunning);
          }




          }

        }

    }

    var MatAr = new Array();
      
    for (var i = 0; i < $scope.colMaterialValues.length; i++) {

        MatAr.push(
            {
                _MaterialKey:$scope.colMaterialValues[i]._MaterialKey,
                MaterialName: $scope.colMaterialValues[i].MaterialName
            })

        $scope.colMaterialValues[i].VCs.sort($scope.compare);

      

        for (var j = 0; j < $scope.colMaterialValues[i].VCs.length; j++) {

          var Count = 0;
          var Sum = 0;
          var Min = undefined;
          var Max = undefined;
          var Variance = 0;
          var TVariance = 0;
          var avg = 0;
          var sdev = 0;
          var Tsdev = 0;
          var cpk = 0;

          var WarUpVal = undefined;
          var RejUpVal = undefined;
          var WarLowVal = undefined;
          var RejLowVal = undefined;
          var TargetVal = undefined;

          var WarUpCnt  = 0;
          var RejUpCnt  = 0;
          var WarLowCnt = 0;
          var RejLowCnt = 0;
          var TargetCnt = 0;

          for (var n = 0; n < $scope.colMaterialValues[i].VCs[j].Data.Values.length; n++) {
            Count = Count + 1;
            Sum = Sum + $scope.colMaterialValues[i].VCs[j].Data.Values[n];

            if (Min == undefined) {
              Min = $scope.colMaterialValues[i].VCs[j].Data.Values[n];
            }
            else if ($scope.colMaterialValues[i].VCs[j].Data.Values[n] < Min) {
              Min = $scope.colMaterialValues[i].VCs[j].Data.Values[n];
            }
            if (Max == undefined) {
              Max = $scope.colMaterialValues[i].VCs[j].Data.Values[n];
            }
            else if ($scope.colMaterialValues[i].VCs[j].Data.Values[n] > Max) {
              Max = $scope.colMaterialValues[i].VCs[j].Data.Values[n];
            }

            if (WarLowVal == undefined) {
              WarLowVal = $scope.colMaterialValues[i].VCs[j].Data.LL[n];
            }
            else if ($scope.colMaterialValues[i].VCs[j].Data.LL[n] < WarLowVal) {
              WarLowVal = $scope.colMaterialValues[i].VCs[j].Data.LL[n];
            }
            if (WarUpVal == undefined) {
              WarUpVal = $scope.colMaterialValues[i].VCs[j].Data.UL[n];
            }
            else if ($scope.colMaterialValues[i].VCs[j].Data.UL[n] > WarUpVal) {
              WarUpVal = $scope.colMaterialValues[i].VCs[j].Data.UL[n];
            }

            if (RejLowVal == undefined) {
              RejLowVal = $scope.colMaterialValues[i].VCs[j].Data.LVL[n];
            }
            else if ($scope.colMaterialValues[i].VCs[j].Data.LVL[n] < RejLowVal) {
              RejLowVal = $scope.colMaterialValues[i].VCs[j].Data.LVL[n];
            }
            if (RejUpVal == undefined) {
              RejUpVal = $scope.colMaterialValues[i].VCs[j].Data.UVL[n];
            }
            else if ($scope.colMaterialValues[i].VCs[j].Data.UVL[n] > RejUpVal) {
              RejUpVal = $scope.colMaterialValues[i].VCs[j].Data.UVL[n];
            }

            if (TargetVal == undefined) {
              TargetVal = $scope.colMaterialValues[i].VCs[j].Data.SP[n];
            }

          }

          avg = Sum / Count;

          for (var n = 0; n < $scope.colMaterialValues[i].VCs[j].Data.Values.length; n++) {

            Variance = Variance + Math.pow($scope.colMaterialValues[i].VCs[j].Data.Values[n] - avg, 2);

            TVariance = TVariance + Math.pow($scope.colMaterialValues[i].VCs[j].Data.Values[n] - TargetVal, 2);

            if (RejLowVal != undefined) {
              if ($scope.colMaterialValues[i].VCs[j].Data.Values[n] < RejLowVal) {
                RejLowCnt = RejLowCnt + 1;
                continue;
              }
            }
            if (WarLowVal != undefined) {
              if ($scope.colMaterialValues[i].VCs[j].Data.Values[n] < WarLowVal) {
                WarLowCnt = WarLowCnt + 1;
                continue;
              }
            }

            if (RejUpVal != undefined) {
              if ($scope.colMaterialValues[i].VCs[j].Data.Values[n] > RejUpVal) {
                RejUpCnt = RejUpCnt + 1;
                continue;
              }
            }

            if (WarUpVal != undefined) {
              if ($scope.colMaterialValues[i].VCs[j].Data.Values[n] > WarUpVal) {
                WarUpCnt = WarUpCnt + 1;
                continue;
              }
            }

            TargetCnt = TargetCnt + 1;
          }

          sdev = Math.sqrt(Variance / Count);
          Tsdev = Math.sqrt(TVariance / Count);

          if (avg - WarLowVal < WarUpVal - avg && (WarLowVal != undefined && WarLowVal != null)) {
            cpk = (avg - WarLowVal) / (3 * sdev);
          }
          else if (avg - WarLowVal > WarUpVal - avg && (WarUpVal != undefined && WarUpVal != null)) {
            cpk = (WarUpVal - avg) / (3 * sdev);
          }
          else if ((WarLowVal != undefined && WarLowVal != null)) {
            cpk = (avg - WarLowVal) / (3 * sdev);
          }
          else if ((WarUpVal != undefined && WarUpVal != null)) {
            cpk = (WarUpVal - avg) / (3 * sdev);
          }
          else {
            cpk = "-";
          }

          $scope.colMaterialValues[i].VCs[j].Data.Average = kendo.toString(avg, "n2");
          $scope.colMaterialValues[i].VCs[j].Data.Std = kendo.toString(sdev, "n2");
          $scope.colMaterialValues[i].VCs[j].Data.Min = kendo.toString(Min, "n2");
          $scope.colMaterialValues[i].VCs[j].Data.Max = kendo.toString(Max, "n2");
          $scope.colMaterialValues[i].VCs[j].Data.RejectLowVal   = kendo.toString(RejLowVal != undefined && RejLowVal != null ? RejLowVal : "-", "n2");
          $scope.colMaterialValues[i].VCs[j].Data.RejectLowPerc  = kendo.toString(RejLowCnt/Count, "p2");
          $scope.colMaterialValues[i].VCs[j].Data.WarningLowVal = kendo.toString(WarLowVal != undefined && WarLowVal != null ? WarLowVal : "-", "n2");
          $scope.colMaterialValues[i].VCs[j].Data.WarningLowPerc = kendo.toString(WarLowCnt/Count, "p2");
          $scope.colMaterialValues[i].VCs[j].Data.TargetVal = kendo.toString(TargetVal != undefined && TargetVal != null ? TargetVal : "-", "n2");
          $scope.colMaterialValues[i].VCs[j].Data.TargetPerc     = kendo.toString(TargetCnt/Count, "p2");
          $scope.colMaterialValues[i].VCs[j].Data.WarningUpVal = kendo.toString(WarUpVal != undefined && WarUpVal != null ? WarUpVal : "-", "n2");
          $scope.colMaterialValues[i].VCs[j].Data.WarningUpPerc  = kendo.toString(WarUpCnt/Count, "p2");
          $scope.colMaterialValues[i].VCs[j].Data.RejectUpVal = kendo.toString(RejUpVal != undefined && RejUpVal != null ? RejUpVal : "-", "n2");
          $scope.colMaterialValues[i].VCs[j].Data.RejectUpPerc   = kendo.toString(RejUpCnt/Count, "p2");
          $scope.colMaterialValues[i].VCs[j].Data.CpK = kendo.toString(cpk != undefined && cpk != null ? cpk : "N/A", "n2");
          $scope.colMaterialValues[i].VCs[j].Data.CpKOOS = cpk != undefined && cpk != null ? (cpk < 0 || cpk > 2 ? 1 : 0) : 0;
          $scope.colMaterialValues[i].VCs[j].Data.Stds = kendo.toString(sdev, "n2");
          $scope.colMaterialValues[i].VCs[j].Data.StdsPerc = kendo.toString(sdev/avg, "p2");
          $scope.colMaterialValues[i].VCs[j].Data.Stdt = kendo.toString(TargetVal != 0 && TargetVal != undefined && TargetVal != null ? Tsdev : "-", "n2");
          $scope.colMaterialValues[i].VCs[j].Data.StdtPerc = kendo.toString(TargetVal != 0 && TargetVal != undefined && TargetVal != null ? Tsdev / TargetVal : "-", "p2");
          $scope.colMaterialValues[i].VCs[j].Data.Total = kendo.toString(Count, "n0");
          $scope.colMaterialValues[i].VCs[j].Data.Tested = kendo.toString(Count, "n0");
          $scope.colMaterialValues[i].VCs[j].Data.Rejected = kendo.toString(RejUpCnt + RejLowCnt, "n0");
        }

        
      var testds = new kendo.data.DataSource({ data: $scope.colMaterialValues[i].VCs, online: false });

      testds.read();

      $scope.colMaterialValues[i].Grid = {  
        dataSource: testds,
        //// columnMenu: true,
        dataBound: function (e) {
        

          // Einfärben
          var headerCells = this.thead.find("th");
          var gridData = this.dataSource.view();

          for (var i = 0; i < gridData.length; i++) {
            for (var property in gridData[i].Data) {
              if (gridData[i].Data.hasOwnProperty(property)) {
                if (property.indexOf("CpKOOS") != -1) {
                  if (gridData[i].Data[property] == 1) {
                    for (var j = 0; j < headerCells.length; j++) {
                      if (headerCells.eq(j).data("field") == "CpK") {
                        $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j - 5]).addClass("gridCellOutOfVetoSpec");
                      }
                    }
                  }
                }
              }
            }
          }
        },   
        columns: [{
            field: "ValueCategoryName",
        },
        {
            field: "Average",
            title: "Average",
            attributes: {
                style: "text-align:center;"
            },
     
            columns: [{
                field: "Std",
                title: "Std",
                attributes: {
                    style: "text-align:center;"
                },
                width: "100px",
                template: "#=  Data.Average+ '<hr> ' + Data.Std #"
            }]
        },
        {
            field: "Empty",
            title: "Min",
            attributes: {
                style: "text-align:center;"
            },
            columns: [{
                field: "Empty",
                title: "Max",
                width: "100px",
                attributes: {
                    style: "text-align:center;"
                },
                template: "#= Data.Min + '<hr> ' + Data.Max #"
            }]
        },
        {
            field: "Empty",
            title: "Control Summary",
            attributes: {
                style: "text-align:center;"
            },
            columns: [{
                field: "Empty",
                title: "Reject",
                width: "70px",
                attributes: {
                    style: "text-align:center;"
                },
                template: "#= Data.RejectLowVal + '<hr> ' + Data.RejectLowPerc #"

            }, {
                field: "Empty",
                title: "Warning",
                width: "70px",
                attributes: {
                    style: "text-align:center;"
                },
                template: "#= Data.WarningLowVal + '<hr> ' + Data.WarningLowPerc #"

            }, {
                field: "Empty",
                title: "Target",
                width: "70px",
                attributes: {
                    style: "text-align:center;"
                },
                template: "#= Data.TargetVal + '<hr> ' + Data.TargetPerc #"

            }, {
                field: "Empty",
                title: "Warning",
                width: "70px",
                attributes: {
                    style: "text-align:center;"
                },
                template: "#= Data.WarningUpVal + '<hr> ' + Data.WarningUpPerc #"
            }, {
                field: "Empty",
                title: "Reject",
                width: "70px",
                attributes: {
                    style: "text-align:center;"
                },
                template: "#= Data.RejectUpVal + '<hr> ' + Data.RejectUpPerc #"
            },
            ]
        }, {
            field: "Empty",
            title: "Capability",
            attributes: {
                style: "text-align:center;"
            },
            columns: [{
                field: "CpK",
                title: "CpK",
                width: "50px",
                attributes: {
                    style: "text-align:center;"
                },
                template: ' #= Data.CpK #'

            }, {
                field: "Empty",
                title: "Std(s)",
                width: "80px",
                attributes: {
                    style: "text-align:center;"
                },
                template: "#= Data.Stds + '<hr> ' + Data.StdsPerc #"
            }, {
                field: "Empty",
                title: "Std(t)",
                width: "80px",
                attributes: {
                    style: "text-align:center;"
                },
                template: "#= Data.Stdt + '<hr> ' + Data.StdtPerc #"
            }]
        }, {
            field: "Empty",
            title: "Sampling",
            attributes: {
                style: "text-align:center;"
            },
            columns: [{
                field: "Empty",
                title: "Total",
                width: "50px",
                attributes: {
                    style: "text-align:center;"
                },
                template: ' #= Data.Total #'
            }, {
                field: "Empty",
                title: "Tested",
                width: "50px",
                attributes: {
                    style: "text-align:center;"
                },
                template: ' #= Data.Tested #'
            }, {
                field: "Empty",
                title: "Rejected",
                width: "50px",
                attributes: {
                    style: "text-align:center;"
                },
                template: ' #= Data.Rejected #'
            }]
        }
        ],
//        height: 700
      }

    }

    var dsMat = new kendo.data.DataSource({ data: MatAr, online: false });

    dsMat.read();

    $("#selectFilterMaterialscroll").data("kendoComboBox").setDataSource(dsMat);

    $scope.$apply();
      
  }
    
  $scope.gridOptions = function (data) {
    return data
  };


  $scope.compare = function (a, b) {
    if (a.SortOrder < b.SortOrder)
      return -1;
    else if (a.SortOrder > b.SortOrder)
      return 1;
    else
      return 0;
  }


}






]);