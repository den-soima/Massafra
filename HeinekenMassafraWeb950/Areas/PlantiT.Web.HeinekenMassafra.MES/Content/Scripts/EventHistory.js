// App: KendoEventHistory
var app = angular.module("KendoEventHistory", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: EventHistoryCtrl
app.controller("EventHistoryCtrl", ['$scope', '$interval', '$document', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsEnumerationTexts', 'refresh', 'kendoOdsUnits', 'kendoOdsMaterials',
function ($scope,$interval, $document, ngDialog, txt, kendoHelper, kendoOdsEnumerationTexts, refresh, kendoOdsUnits, kendoOdsMaterials) {

  // Konstanten                                                        
  const TIMEINTERVAL_PER_DAY_MS = 86400000;

  const TIMEOUT_DELAY_DATABOUND = 500;  // notwendig um doppeltes Aufrufen zu vermeiden

  const BatchName = "Const_BatchName";
  const BrewLine = "Const_BrewLine";
  const Material = "Const_Material";
  const Result = "Const_Result";


  // interne Variablen
  var m_dataColumnsInitialized = false;
  var m_dataColumnsDSInitialized = false;
  var m_dataFilterValuesInitialized = false;
  var m_dataSourceFilterEventHistoryInitialized = false;
  var m_dataSourceFilterLineInitialized = false;
  var m_dataSourceFilterMaterialInitialized = false;
  var m_dataSourceFilterUnitInitialized = false;
  var m_dataSourceFilterBatchInitialized = false;
  var m_dataSourceValuesInitialized = false;

  //Testparamter für Filter
  var m_MaxVCKey = undefined;
  var m_MinVCKey = undefined;

  var m_UsedKeys = undefined;
  
  var m_HeaderLines = undefined;


  //Footer
  var m_ResultTotal = 0;

  var m_ColumnsInitialized = false;

  var m_checkColumnNames = undefined;
  var m_checkColumns = undefined;

  //Aktualisierung
  var m_timeoutEventHistoryValuesHandle = new Array();

  var m_Columns = new Array();
  var m_Limits = undefined;

  var m_ColumnNamesGlobal = undefined;
 
  // DataSource für m_dataSourceFilterEventHistory
  var m_dataSourceFilterEventHistory = new kendo.data.DataSource({
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
      if (!m_dataFilterValuesInitialized || !m_dataSourceFilterEventHistoryInitialized) {
        e.preventDefault();

        // Datenquelle wurde initialisiert
        m_dataSourceFilterEventHistoryInitialized = true;

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
          "TemplateName": { type: "string", editable: false },
          "_UsageEnumerationTextLink": { type: "string", editable: false },
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
      PCommonPortalMethods.GetSiteLanguage() == "en" ? value.TemplateGlobalName : value.TemplateLocalName;
    }

    return response;
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

  // DataSource für m_dataSourceFilterUnit
  var m_dataSourceFilterUnit = new kendo.data.DataSource({

    type: "odata-v4",
    transport: {
      read: {
        url: $("#gatewayPath").data("value") + "odata/ods/Units",

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
      if (!m_dataSourceFilterUnitInitialized || !m_dataFilterValuesInitialized) {
        e.preventDefault();

        // Datenquelle wurde initialisiert
        m_dataSourceFilterUnitInitialized = true;

      }
    },
    schema: {
      model: {
        id: "_Key",
        fields: {
          "_Key": { type: "number" },
          "UnitLocalName": { type: "string" },
          "UnitGlobalName": { type: "string" },
          "UnitName": { type: "string" },
        }
      },

      parse: function (response) {
        var values = response.value,
            n = values.length,
            i = 0,
            value;
        for (; i < n; i++) {
          value = values[i];
          value.UnitName =
          PCommonPortalMethods.GetSiteLanguage() == "en" ? value.UnitGlobalName : value.UnitLocalName;
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

  $scope.GetColumnNames = function () {
    return new kendo.data.DataSource({

      type: "odata-v4",

    transport: {
      read: {
        url: $("#gatewayPath").data("value") + "odata/ods/ZWebEventHistoryDatas",

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
          }
          return result;

   
        }
      },
    },
    requestStart: function (e) {
      // Wenn noch nicht initialisiert, abbruch
      if (!m_dataColumnsInitialized || !m_dataColumnsDSInitialized) {
        e.preventDefault();

        // Datenquelle wurde initialisiert
        m_dataColumnsDSInitialized = true;

      }
    },
    schema: {
      model: {
        id: "_Key",
        fields: {
          "_ValueCategoryKey": { type: "number" },         
          "_ZTemplateKey": { type: "number" },
          "ValueCategoryGlobalName": {  type: "string", parse: function (value) { return (value === undefined) ? "" : value; } },
          "ValueCategoryLocalName": { type: "string", parse: function (value) { return (value === undefined) ? "" : value; } },
        }
      },

    parse: function (response) {

      var pivotValue = new Array();

      m_HeaderLines = 0;

      m_Limits = new Array();

      if (response.value.length > 0) 

        //Batches anlegen
        for (var i = 0; i < response.value.length; i++) {

          var BatchPresent = false;

          for (var j = 0; j < pivotValue.length; j++) {
            if (pivotValue[j]._BatchKey == response.value[i]._BatchKey) {
              BatchPresent = true;
            }
          }

          if (!BatchPresent) {
            pivotValue.push({
              Const_Material: PCommonPortalMethods.GetSiteLanguage() == "en" ? response.value[i].MaterialGlobalName : response.value[i].MaterialLocalName,
              Const_BatchName: response.value[i].BatchName.substring(0, response.value[i].BatchName.indexOf(".")),
              Const_BrewLine: response.value[i].BrewLine,
              _BatchKey: response.value[i]._BatchKey
            });
          }
        }

      var values = [];

      if ($scope.cbFilterEventHistory != undefined) {
        values = response.value.sort($scope.compareVCPOS);
      }
      else {
        values = response.value.sort($scope.compareVCSO);
      }
     
     
      //Werte pivotisieren und Result bilden
      for (var i = 0; i < values.length; i++) {

        for (var j = 0; j < pivotValue.length; j++) {

          var CurrentColumn = "VC_" + values[i]._ValueCategoryKey.toString();
          var CurrentColumnOOS = "VCOOS_" + values[i]._ValueCategoryKey.toString();
          var CurrentColumnVCN = "VCN_" + values[i]._ValueCategoryKey.toString();
          if (pivotValue[j]._BatchKey == values[i]._BatchKey) {
            if (values[i].Value != null && values[i].Value != undefined) {
              pivotValue[j][CurrentColumn] = values[i].Value.toString() != undefined ? kendo.toString(values[i].Value,"n2"): "";
            }
            else if (values[i].ValueString != null && values[i].ValueString != undefined) {
              pivotValue[j][CurrentColumn] = values[i].ValueString.toString();
            }
            else if ((values[i].EnumerationTextLocalName != null && values[i].EnumerationTextLocalName != undefined) || (values[i].EnumerationTextGlobalName != null && values[i].EnumerationTextGlobalName != undefined)) {
              if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                pivotValue[j][CurrentColumn] = values[i].EnumerationTextGlobalName != null && values[i].EnumerationTextGlobalName != undefined ? values[i].EnumerationTextGlobalName : values[i].EnumerationTextLocalName;
              } else {
                pivotValue[j][CurrentColumn] = values[i].EnumerationTextLocalName != null && values[i].EnumerationTextLocalName != undefined ? values[i].EnumerationTextLocalName : values[i].EnumerationTextGlobalName;
              }


            }
            else {
              pivotValue[j][CurrentColumn] = "-";
            }                 
            pivotValue[j][CurrentColumnOOS] = values[i].OutOfSpec;
            pivotValue[j][CurrentColumnVCN] = PCommonPortalMethods.GetSiteLanguage() == "en" ? values[i].ValueCategoryGlobalName : values[i].ValueCategoryLocalName;

            var Start = pivotValue[j][CurrentColumnVCN].indexOf(" ");

            if (pivotValue[j][CurrentColumnVCN].substring(Start).length <= 18 && m_HeaderLines < 1) {
              m_HeaderLines = 1
            }
            if (pivotValue[j][CurrentColumnVCN].substring(Start).length > 18 && pivotValue[j][CurrentColumnVCN].substring(Start).length <= 36 && m_HeaderLines <2) {
              m_HeaderLines = 2
            }
            if (pivotValue[j][CurrentColumnVCN].substring(Start).length > 36 && m_HeaderLines < 3) {
              m_HeaderLines = 3
            }



            m_Limits.push({
              ValueCategoryKey: values[i]._ValueCategoryKey,
              UpperLimit: values[i].UpperLimit,
              LowerLimit: values[i].LowerLimit,
              Setpoint: values[i].Setpoint,
              UpperVetoLimit: values[i].UpperVetoLimit,
              LowerVetoLimit: values[i].LowerVetoLimit,
              UnitOfMeasurement: values[i].UnitOfMeasurement
            });


          }
          else if (pivotValue[j][CurrentColumn] == undefined) {
            pivotValue[j][CurrentColumn] = "-";
            pivotValue[j][CurrentColumnOOS] = 2;

            for (var n = 0; n < values.length; n++) {
              if (CurrentColumn == "VC_" + values[n]._ValueCategoryKey.toString() && (PCommonPortalMethods.GetSiteLanguage() == "en" ? values[n].ValueCategoryGlobalName != undefined : values[n].ValueCategoryLocalName != undefined))
              {
                pivotValue[j][CurrentColumnVCN] = PCommonPortalMethods.GetSiteLanguage() == "en" ? values[i].ValueCategoryGlobalName : values[i].ValueCategoryLocalName;;

                var Start = pivotValue[j][CurrentColumnVCN].indexOf(" ");

                if (pivotValue[j][CurrentColumnVCN].substring(Start).length <= 18 && m_HeaderLines < 1) {
                  m_HeaderLines = 1
                }
                if (pivotValue[j][CurrentColumnVCN].substring(Start).length > 18 && pivotValue[j][CurrentColumnVCN].substring(Start).length <= 36 && m_HeaderLines < 2) {
                  m_HeaderLines = 2
                }
                if (pivotValue[j][CurrentColumnVCN].substring(Start).length > 36 && m_HeaderLines < 3) {
                  m_HeaderLines = 3
                }
                break;
              }
            }


          }
        }
      }
          
      response.value = pivotValue;

      return response;
    }
    },
    batch: false,
    serverPaging: true,
    serverSorting: true,
    serverFiltering: true

  });
  };
  
  // DateTimePicker für Batchzeiten                                              
  $scope.dtEventHistoryEndTime = new Date();
  $scope.dtEventHistoryStartTime = new Date($scope.dtEventHistoryEndTime - 30 * TIMEINTERVAL_PER_DAY_MS);

    // Verweis auf Service      
  $scope.srv_kendoOdsEnumerationTexts = kendoOdsEnumerationTexts;

  $document.ready(function () {
    m_dataFilterValuesInitialized = false;
    $scope.cbFilterEventHistory = undefined;
    $scope.cbFilterLine = undefined;
    $scope.cbFilterMaterial = undefined;
    $scope.cbFilterUnit = undefined;
    $scope.cbFilter1stBatchValue = undefined;
    $scope.cbFilter2ndBatchValue = undefined;

    $("#comboBoxFilterEventHistory").data("kendoComboBox").setDataSource(m_dataSourceFilterEventHistory);
    $("#comboBoxFilterLine").data("kendoComboBox").setDataSource(m_dataSourceFilterLine);
    $("#comboBoxFilterMaterial").data("kendoComboBox").setDataSource(m_dataSourceFilterMaterial);
    $("#comboBoxFilterUnit").data("kendoComboBox").setDataSource(m_dataSourceFilterUnit);
    $("#comboBox1stFilterBatch").data("kendoComboBox").setDataSource(m_dataSourceFilterBatch);
    $("#comboBox2ndFilterBatch").data("kendoComboBox").setDataSource(m_dataSourceFilterBatch);
    
    kendoHelper.setDataSourceFilters(m_dataSourceFilterEventHistory, "_UsageEnumerationTextLink", "eq", "*[Template Type].2*");
    kendoHelper.setDataSourceFilters(m_dataSourceFilterLine, "Classifications", "neq", ";;");
    //kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "BatchType/Classifications", "neq", ";;");
    kendoHelper.setDataSourceFilters(m_dataSourceFilterMaterial, "Classifications", "contains", ";MATERIALCLASS_WORT;");
    kendoHelper.setDataSourceFilters(m_dataSourceFilterUnit, "Classifications", "contains", ";UNIT_BREWLINE;");
    kendoHelper.setDataSourceSorts(m_dataSourceFilterUnit, "UnitLocalName", "asc");
    kendoHelper.setDataSourceSorts(m_dataSourceFilterBatch, "BatchName", "asc");

    m_dataFilterValuesInitialized = true;

    m_dataSourceFilterEventHistory.read();
    m_dataSourceFilterBatch.read();
    m_dataSourceFilterLine.read();
    m_dataSourceFilterMaterial.read();
    m_dataSourceFilterUnit.read();

    $scope.OnFilterChanged();

  });

  

  // ----------------------------------------
  // Defaultwerte für Filtereinstellungen
  $scope.cbFilterEventHistory = undefined;
  $scope.cbFilterLine = undefined;
  $scope.cbFilterMaterial = undefined;
  $scope.cbFilterUnit = undefined;

  // ----------------------------------------
  // Optionen für EventHistory
  $scope.comboBoxFilterEventHistory = {
    dataTextField: "TemplateName",
    dataValueField: "_Key",
    filter: "contains",
    minLength: 3,
    delay: 200
   
  };

  // ----------------------------------------
  // Optionen für comboBoxFilterLine
  $scope.comboBoxFilterLine = {
    dataTextField: "BatchTypeName",
    dataValueField: "_Key",
    filter: "contains",
    minLength: 3,
    delay: 200,
    change: function () {
      $scope.OnFilterChanged();       
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
    change: function () {
      $scope.OnFilterChanged();        // TODO
    }

  };

  // ----------------------------------------
  // Optionen für comboBoxFilterUnit
  $scope.comboBoxFilterUnit = {
    dataTextField: "UnitName",
    dataValueField: "_Key",
    filter: "contains",
    minLength: 3,
    delay: 200

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
  $scope.dateTimePickerEventHistoryStartTime = {
    change: function () {
      $scope.OnFilterChanged();
    }
  };

  // Optionen für dateTimePickerStop 
  $scope.dateTimePickerEventHistoryEndTime = {
    change: function () {
      $scope.OnFilterChanged();
    }
  };

  // Optionen für Grid EventHistoryValues        
  $scope.GetGridEventHistoryValuesOptions = function (col,ds) {
    return {
      dataSource: ds,
      autoBind: false,
      scrollable: true,
      sortable: true,
      editable: false,
      resizable: true,
      selectable: true,
      columns: col,
      
      dataBound: function (e) {

        // Einfärben
        var headerCells = this.thead.find("th");
        var gridData = this.dataSource.view();

        for (var i = 0; i < gridData.length; i++) {
          for (var property in gridData[i]) {
            if (gridData[i].hasOwnProperty(property)) {
              if (property.indexOf("VCOOS_") != -1) {
                if (gridData[i][property] == 1) {
                  for (var j = 0; j < headerCells.length; j++) {
                    if (headerCells.eq(j).data("field") == "VC_" +  property.substring(6)) {
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfSpec");
                    }
                  }
                }
                if (gridData[i][property] == 3) {
                  for (var j = 0; j < headerCells.length; j++) {
                    if (headerCells.eq(j).data("field") == "VC_" + property.substring(6)) {
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellOutOfVetoSpec");
                    }
                  }
                }
                if (gridData[i][property] == 2) {
                  for (var j = 0; j < headerCells.length; j++) {
                    if (headerCells.eq(j).data("field") == "VC_" + property.substring(6)) {
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellEmpty");
                    }
                  }
                }
                if (gridData[i][property] == 0) {
                  for (var j = 0; j < headerCells.length; j++) {
                    if (headerCells.eq(j).data("field") == "VC_" + property.substring(6)) {
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellInSpec");
                    }
                  }
                }
              }

              //if (property.indexOf(Result) != -1) {
              //  for (var j = 0; j < headerCells.length; j++) {
              //    if (headerCells.eq(j).data("field") == Result) {
              //      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellResult");
              //    }
              //  }

              //}

            }
          }
        }
      },
    };
  };

  //Rebind flag setzten (Bool, dann kann einfach mit true und false getriggert werden)
  $scope.doRebind = false;

  $scope.OnLoadValues = function () {
    // DataSource für m_ColumnNames
    m_dataColumnsInitialized = false;

    var m_ColumnNames = $scope.GetColumnNames();

    //Material selection is mandatory
    if ($scope.cbFilterMaterial != undefined) {
      kendoHelper.setDataSourceFilters(m_ColumnNames, "_MaterialKey", "eq", $scope.cbFilterMaterial._Key);
    } else {
      var dlg = ngDialog.open({
        template: 'modalDialogNoMaterialSelectionTemplate',
        scope: $scope
      });
     
      return;
    }


    if ($scope.cbFilterEventHistory != undefined) {
        kendoHelper.setDataSourceFilters(m_ColumnNames, "_ZTemplateKey", "eq", $scope.cbFilterEventHistory._Key);
    }
    if ($scope.cbFilterUnit != undefined) {
        kendoHelper.setDataSourceFilters(m_ColumnNames, "_UnitKey", "eq", $scope.cbFilterUnit._Key);
    }
    


    if ($scope.cbFilterLine != undefined) {
      kendoHelper.setDataSourceFilters(m_ColumnNames, "_BatchTypeKey", "eq", $scope.cbFilterLine._Key);
    }
    if ($scope.cbFilter1stBatchValue != undefined) {
      kendoHelper.setDataSourceFilters(m_ColumnNames, "_BatchKey", "gte", $scope.cbFilter1stBatchValue._Key);
    }
    if ($scope.cbFilter2ndBatchValue != undefined) {
      kendoHelper.setDataSourceFilters(m_ColumnNames, "_BatchKey", "lte", $scope.cbFilter2ndBatchValue._Key);
    }

    kendoHelper.setDataSourceFilters(m_ColumnNames, "StartTime", "gte", $scope.dtEventHistoryStartTime);
    kendoHelper.setDataSourceFilters(m_ColumnNames, "StartTime", "lte", $scope.dtEventHistoryEndTime);

    // Sortierung setzen
    kendoHelper.setDataSourceSorts(m_ColumnNames, "StartTime", "asc");

    m_dataColumnsInitialized = true;

    m_ColumnNames.read();
    m_ColumnNames.fetch();

      m_ColumnsInitialized = false;
      m_checkColumnNames = $interval(function () {
        if (m_ColumnNames._data.length > 0) {

          //$scope.m_ColumnNamesGlobal = m_ColumnNames 

          m_Columns = new Array();
          m_UsedKeys = new Array();

          m_Columns.push({
            field: Material,
            title: txt.TXT_MATERIAL,
            width: "130px",
            locked: true,
          });

          var footertemplateBN = '<div style="text-align: center">Average</div>';
          footertemplateBN = footertemplateBN + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">Std Dev</div>';
          footertemplateBN = footertemplateBN + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">Minimum</div>';
          footertemplateBN = footertemplateBN + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">Maximum</div>';
          footertemplateBN = footertemplateBN + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">Count</div>';
          footertemplateBN = footertemplateBN + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">In Spec</div>';
          footertemplateBN = footertemplateBN + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">% Conf</div>';

          var headertemplateBN = '<div style="text-align: center">Value name</div>';
          for (var i = 1; i < m_HeaderLines; i++) {
            headertemplateBN = headertemplateBN + '<div style="text-align: center">&nbsp</div>';
          }
          headertemplateBN = headertemplateBN + '<hr style="margin-left: -10px;margin-right: -10px;border: 0; border-bottom: 1px dashed #ccc;">' + '<div style="text-align: center">UoM</div>';
          headertemplateBN = headertemplateBN + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">Setpoint</div>';
          headertemplateBN = headertemplateBN + '<div style="text-align: center">Limit</div>';
          headertemplateBN = headertemplateBN + '<div style="text-align: center">Veto limit</div>';

          m_Columns.push({
            field: BatchName,
            title: txt.TXT_BATCH_NAME,
            template: '<div style="text-align: center"> #= Const_BatchName # </div>',
            width: "120px",
            //footerTemplate: footertemplateBN,
            //headerTemplate: headertemplateBN,
            locked: true,
          });

          m_Columns.push({
            field: BrewLine,
            title: txt.TXT_BREWLINE,
            template: '<div style="text-align: center"> #= Const_BrewLine # </div>',
            width: "80px",
            footerTemplate: footertemplateBN,
            headerTemplate: headertemplateBN,
            locked: true,
          });



          for (var i = 0; i < m_ColumnNames._data.length; i++) {

            for (var property in m_ColumnNames._data[i]) {
              if (m_ColumnNames._data[i].hasOwnProperty(property)) {
                if (property.indexOf("VC_") != -1 && m_UsedKeys.indexOf(property) == -1 ) {
                  m_UsedKeys.push(property);

                  var SPMA = undefined;
                  var SPMI = undefined;
                  var LLMA = undefined;
                  var LLMI = undefined
                  var ULMA = undefined;
                  var ULMI = undefined;
                  var VLLMA = undefined;
                  var VLLMI = undefined
                  var VULMA = undefined;
                  var VULMI = undefined;

                  var UoM = undefined;

                  if (m_Limits.length > 0) {
                    for (var j = 0; j < m_Limits.length; j++) {
                      if (m_Limits[j].ValueCategoryKey.toString() == property.replace("VC_", "")) {
                        if (m_Limits[j].Setpoint != null && m_Limits[j].Setpoint != undefined && (SPMI == undefined || m_Limits[j].Setpoint < SPMI)) {
                          SPMI = m_Limits[j].Setpoint;
                        }
                        if (m_Limits[j].Setpoint != null && m_Limits[j].Setpoint != undefined && (SPMA == undefined || m_Limits[j].Setpoint > SPMA)) {
                          SPMA = m_Limits[j].Setpoint;
                        }

                        if (m_Limits[j].LowerLimit != null && m_Limits[j].LowerLimit != undefined && (LLMI == undefined || m_Limits[j].LowerLimit < LLMI)) {
                          LLMI = m_Limits[j].LowerLimit;
                        }
                        if (m_Limits[j].LowerLimit != null && m_Limits[j].LowerLimit != undefined && (LLMA == undefined || m_Limits[j].LowerLimit > LLMA)) {
                          LLMA = m_Limits[j].LowerLimit;
                        }
                        
                        if (m_Limits[j].UpperLimit != null && m_Limits[j].UpperLimit != undefined && (ULMI == undefined || m_Limits[j].UpperLimit < ULMI)) {
                          ULMI = m_Limits[j].UpperLimit;
                        }
                        if (m_Limits[j].UpperLimit != null && m_Limits[j].UpperLimit != undefined && (ULMA == undefined || m_Limits[j].UpperLimit > ULMA)) {
                          ULMA = m_Limits[j].UpperLimit;
                        }

                        if (m_Limits[j].LowerVetoLimit != null && m_Limits[j].LowerVetoLimit != undefined && (VLLMI == undefined || m_Limits[j].LowerVetoLimit < VLLMI)) {
                          VLLMI = m_Limits[j].LowerVetoLimit;
                        }
                        if (m_Limits[j].LowerVetoLimit != null && m_Limits[j].LowerVetoLimit != undefined && (VLLMA == undefined || m_Limits[j].LowerVetoLimit > VLLMA)) {
                          VLLMA = m_Limits[j].LowerVetoLimit;
                        }

                        if (m_Limits[j].UpperVetoLimit != null && m_Limits[j].UpperVetoLimit != undefined && (VULMI == undefined || m_Limits[j].UpperVetoLimit < VULMI)) {
                          VULMI = m_Limits[j].UpperVetoLimit;
                        }
                        if (m_Limits[j].UpperVetoLimit != null && m_Limits[j].UpperVetoLimit != undefined && (VULMA == undefined || m_Limits[j].UpperVetoLimit > VULMA)) {
                          VULMA = m_Limits[j].UpperVetoLimit;
                        }

                        UoM = m_Limits[j].UnitOfMeasurement;

                      }
                    }
                  }

                  if (SPMA == SPMI) {
                    SPMA = undefined;
                  }
                  if (LLMA == LLMI) {
                    LLMA = undefined;
                  }
                  if (ULMA == ULMI) {
                    ULMA = undefined;
                  }

                  if (VLLMA == VLLMI) {
                    VLLMA = undefined;
                  }
                  if (VULMA == VULMI) {
                    VULMA = undefined;
                  }

                  var Offset = 0;

                  var Start = m_ColumnNames._data[i][property.replace("VC_", "VCN_")].indexOf(" ");

                  var headertemplate = '<div style="text-align: center">' + m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(0, Start) + '</div>';

                  for (var j = 0; j < m_HeaderLines; j++) {
                    if (m_ColumnNames._data[i][property.replace("VC_", "VCN_")] != undefined ||

                      m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, (j + 1) * 18) != undefined) {

                      if (m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substr((j + 1) * 18, 1) == " " || m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substr((j + 1) * 18, 1) == ""
                        || m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substr(((j + 1) * 18) - 1, 1) == " " || m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substr(((j + 1) * 18) - 1, 1) == "") {
                        
                        var headstr = m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, (j + 1) * 18) != undefined && m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, (j + 1) * 18) != "" ? m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, (j + 1) * 18) : "&nbsp";

                        headertemplate = headertemplate + '<div style="text-align: center">' + headstr + '</div>';
                      }
                      else if (m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substr(((j + 1) * 18) + 1, 1) == " " || m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substr(((j + 1) * 18) + 1, 1) == "") {

                        var headstr = m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, ((j + 1) * 18) + 1) != undefined && m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, ((j + 1) * 18) + 1) != "" ? m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, ((j + 1) * 18) + 1) : "&nbsp";
                        headertemplate = headertemplate + '<div style="text-align: center">' + headstr + '</div>';
                        Offset = Offset + 1;
                      }
                      else if (m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substr(((j + 1) * 18) - 2, 1) == " " || m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substr(((j + 1) * 18) - 2, 1) == "") {

                        var headstr = m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, ((j + 1) * 18) - 2) != undefined && m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, ((j + 1) * 18) - 2) != "" ? m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, ((j + 1) * 18) - 2) : "&nbsp";
                        headertemplate = headertemplate + '<div style="text-align: center">' + headstr + '</div>';
                        Offset = Offset - 1;
                      }

                      else {
                        var headstr = m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, (j + 1) * 18) != undefined && m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, (j + 1) * 18) != "" ? m_ColumnNames._data[i][property.replace("VC_", "VCN_")].substring(Start + Offset).substring(j * 18, (j + 1) * 18) : "&nbsp";

                        headertemplate = headertemplate + '<div style="text-align: center">' + headstr + '-</div>';;
                      }

                      
                    }
                    else {
                      var test = 1;
                    }

                    
                  }
                  headertemplate = headertemplate + '<hr style="margin-left: -10px;margin-right: -10px;border: 0; border-bottom: 1px dashed #ccc;">' + '<div style="text-align: center">' + '[' + (UoM != undefined ? UoM.replace("[", "").replace("]", "") : "")  + ']' + '</div>';;
                  headertemplate = headertemplate + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">' + (SPMA == undefined && SPMI == undefined ? "*" : (SPMA == undefined ? kendo.toString(SPMI, "n2") : kendo.toString(SPMI, "n2") + "-" + kendo.toString(SPMA, "n2"))) + '</div>';
                  headertemplate = headertemplate + '<div style="text-align: center">' + ((LLMA == undefined && LLMI == undefined ? "*" : (LLMA == undefined ? kendo.toString(LLMI, "n2") : "(" + kendo.toString(LLMI, "n2") + "; " + kendo.toString(LLMA, "n2") + ")"))) + " - " 
                    + ((ULMA == undefined && ULMI == undefined ? "*" : (ULMA == undefined ? kendo.toString(ULMI, "n2") : "(" + kendo.toString(ULMI, "n2") + "; " + kendo.toString(ULMA, "n2") + ")"))) + '</div>';
                  headertemplate = headertemplate + '<div style="text-align: center">' + ((VLLMA == undefined && VLLMI == undefined ? "*" : (VLLMA == undefined ? kendo.toString(VLLMI, "n2") : "(" + kendo.toString(VLLMI, "n2") + "; " + kendo.toString(VLLMA, "n2") + ")"))) + " - "
                   + ((VULMA == undefined && VULMI == undefined ? "*" : (VULMA == undefined ? kendo.toString(VULMI, "n2") : "(" + kendo.toString(VULMI, "n2") + "; " + kendo.toString(VULMA, "n2") + ")"))) + '</div>';

                  var footertemplate = '<div style="text-align: center">#= kendo.toString(doMath("' + property + '").Avg, "n2") # </div>';
                  footertemplate = footertemplate + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">#= kendo.toString(doMath("' + property + '").StdDev, "n2") # </div>';
                  footertemplate = footertemplate + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">#= kendo.toString(doMath("' + property + '").Min, "n2") # </div>';
                  footertemplate = footertemplate + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">#= kendo.toString(doMath("' + property + '").Max, "n2") # </div>';
                  footertemplate = footertemplate + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">#= kendo.toString(doMath("' + property + '").Count, "n2") # </div>';
                  footertemplate = footertemplate + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">#= kendo.toString(doMath("' + property + '").InSpec, "n2") # </div>';
                  footertemplate = footertemplate + '<hr style="margin-left: -10px;margin-right: -10px;">' + '<div style="text-align: center">#= kendo.toString(doMath("' + property + '").Conf, "n2") # </div>';


                  m_Columns.push({
                    field: property,
                    width: "130px",
                    attributes: { "class": "ob-center" },
                    //template: template,
                    footerTemplate: footertemplate,
                    headerTemplate: headertemplate,
                  });
                }
              }
            }
          };
          m_ColumnsInitialized = true;
          $interval.cancel(m_checkColumnNames);
        }

       

      }, 100);
      

      m_checkColumns = $interval(function () {
        if (m_ColumnsInitialized) {

          // Sperren
          m_dataColumnsInitialized = false;
          // Werte initialisiert
          $scope.gridEventHistoryValues = $scope.GetGridEventHistoryValuesOptions(m_Columns, m_ColumnNames);
     
          $scope.doRebind = !$scope.doRebind;

          m_dataColumnsInitialized = true;
         
          m_ColumnsInitialized = false;
          $interval.cancel(m_checkColumns);
        }
      }, 100);

    
   

    doMath = function (columnField) {
      var data = $scope.gridEventHistoryValues.dataSource._data;
      var summedValues = 0;
      var Results = new Object();
      var CalcCount = 0

      var count = 0
      var confCount = 0
      var max   = undefined;
      var min = undefined;
      var avg = 0;
      var svariance = 0;
      var sdev = 0;

      //Einmal für Englisch, einmal für andere berechnen wegen trennzeichen
      if (PCommonPortalMethods.GetSiteLanguage() == "en") {
        for (var i = 0; i < data.length; i++) {
          if (data[i][columnField] != undefined) {
          if (data[i][columnField].replace(",", "") != undefined) {
            if (!isNaN(parseFloat(data[i][columnField].replace(",", ""))) && isFinite(parseFloat(data[i][columnField].replace(",", "")))) {
              summedValues = summedValues + parseFloat(data[i][columnField].replace(",", ""));
              CalcCount = CalcCount + 1;
              if (min == undefined || parseFloat(data[i][columnField].replace(",", "")) < min) {
                min = parseFloat(data[i][columnField].replace(",", ""));
              }
              if (max == undefined || parseFloat(data[i][columnField].replace(",", "")) > max) {
                max = parseFloat(data[i][columnField].replace(",", ""));
              }
            }
          };
          if (data[i][columnField].replace(",", "") != "-" && data[i][columnField].replace(",", "") != undefined) {
            count = count + 1;
            if (data[i][columnField.replace("VC_","VCOOS_")] == 0) {
              confCount = confCount + 1;
            }
          }
        }
      }

        avg = summedValues / CalcCount;

        for (var i = 0; i < data.length; i++) {
          if (data[i][columnField] != undefined) {
            if (data[i][columnField].replace(",", "") != undefined) {
              if (!isNaN(parseFloat(data[i][columnField].replace(",", ""))) && isFinite(parseFloat(data[i][columnField].replace(",", "")))) {
                svariance = svariance + Math.pow(parseFloat(data[i][columnField].replace(",", "")) - avg, 2);
              }
            }
          }
        }

        sdev = Math.sqrt(svariance / CalcCount);

        Results["Avg"] = kendo.toString(avg, "n2");
        Results["StdDev"] = kendo.toString(sdev, "n2");
        Results["Min"] = kendo.toString(min != undefined ? min : 0, "n2");
        Results["Max"] = kendo.toString(max != undefined ? max : 0, "n2");
        Results["Count"] = kendo.toString(count, "n0");
        Results["InSpec"] = kendo.toString(confCount, "n0");
        Results["Conf"] = kendo.toString(confCount / count * 100, "n0");
        return Results;
      }
      else {
        for (var i = 0; i < data.length; i++) {
          if (data[i][columnField] != undefined) {
            if (data[i][columnField].replace(".", "").replace(",", ".") != undefined) {
              if (!isNaN(parseFloat(data[i][columnField].replace(".", "").replace(",", "."))) && isFinite(parseFloat(data[i][columnField].replace(".", "").replace(",", ".")))) {
                summedValues = summedValues + parseFloat(data[i][columnField].replace(".", "").replace(",", "."));
                CalcCount = CalcCount + 1;
                if (min == undefined || parseFloat(data[i][columnField].replace(".", "").replace(",", ".")) < min) {
                  min = parseFloat(data[i][columnField].replace(".", "").replace(",", "."));
                }
                if (max == undefined || parseFloat(data[i][columnField].replace(".", "").replace(",", ".")) > max) {
                  max = parseFloat(data[i][columnField].replace(".", "").replace(",", "."));
                }
              }
            };
            if (data[i][columnField].replace(".", "").replace(",", ".") != "-" && data[i][columnField].replace(".", "").replace(",", ".") != undefined) {
              count = count + 1;
              if (data[i][columnField.replace("VC_", "VCOOS_")] == 0) {
                confCount = confCount + 1;
              }


            }
          }
        }
        avg = summedValues / CalcCount

        for (var i = 0; i < data.length; i++) {
          if (data[i][columnField] != undefined) {
            if (data[i][columnField].replace(".", "").replace(",", ".") != undefined) {
              if (!isNaN(parseFloat(data[i][columnField].replace(".", "").replace(",", "."))) && isFinite(parseFloat(data[i][columnField].replace(".", "").replace(",", ".")))) {
                svariance = svariance + Math.pow(parseFloat(data[i][columnField].replace(".", "").replace(",", ".")) - avg, 2);
              }
            }
          }
        }

        sdev = Math.sqrt(svariance / CalcCount);

        Results["Avg"] = kendo.toString(avg, "n2");
        Results["StdDev"] = kendo.toString(sdev, "n2");
        Results["Min"] = kendo.toString(min != undefined ? min : 0, "n2");
        Results["Max"] = kendo.toString(max != undefined ? max : 0, "n2");
        Results["Count"] = kendo.toString(count, "n0");
        Results["InSpec"] = kendo.toString(confCount, "n0");
        Results["Conf"] = kendo.toString(confCount/count*100, "n0");
        return Results;
      }

     
    }

    getBatchKey = function (data) {
      return data._BatchKey;
    };

   
  }

  $scope.OnFilterChanged = function () {
    // DataSource für m_ColumnNames

    // Sperren
    m_dataFilterValuesInitialized = false;

    if ($scope.cbFilterMaterial != undefined) {
      kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "_MaterialKey", "eq", $scope.cbFilterMaterial._Key);
    }

    if ($scope.cbFilterLine != undefined) {
      kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "_BatchTypeKey", "eq", $scope.cbFilterLine._Key);
    }

    if ($scope.dtEventHistoryStartTime != undefined || $scope.dtEventHistoryEndTime != undefined) {
      kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "StartTime", "gte", $scope.dtEventHistoryStartTime);
      kendoHelper.setDataSourceFilters(m_dataSourceFilterBatch, "StartTime", "lte", $scope.dtEventHistoryEndTime);
    }
      // Werte initialisiert
    m_dataFilterValuesInitialized = true;

      // Datenquelle zuweisen
      $scope.comboBox1stFilterBatch.dataSource = m_dataSourceFilterBatch;
      $scope.comboBox2ndFilterBatch.dataSource = m_dataSourceFilterBatch;

      // Datenquelle lesen
      $scope.comboBox1stFilterBatch.dataSource.read();
      $scope.comboBox2ndFilterBatch.dataSource.read();
    

   
  }

  // FilterLine delete
  $scope.OnFilterLineDelete = function () {
    $scope.cbFilterLine = undefined;
    $scope.OnFilterChanged();
  }

  // FilterMaterial delete
  $scope.OnFilterMaterialDelete = function () {
    $scope.cbFilterMaterial = undefined;
    $scope.OnFilterChanged();
  }

  $scope.On1stFilterBatchDelete = function () {
    $scope.cbFilter1stBatchValue = undefined;
    $scope.OnFilterChanged();
  }

  $scope.On2ndFilterBatchDelete = function () {
    $scope.cbFilter2ndBatchValue = undefined;
    $scope.OnFilterChanged();
  }

  $scope.OnFilterUnitDelete = function () {
    $scope.cbFilterUnit = undefined;
    $scope.OnFilterChanged();
  }

  $scope.OnFilterEventHistoryDelete = function () {
    $scope.cbFilterEventHistory = undefined;
    $scope.OnFilterChanged();
  }

  $scope.arrayMin = function (arr) {
    var len = arr.length, min = Infinity;
    while (len--) {
      if (arr[len] < min) {
        min = arr[len];
      }
    }
    return min;
  };

  $scope.arrayMax = function (arr) {
    var len = arr.length, max = -Infinity;
    while (len--) {
      if (arr[len] > max) {
        max = arr[len];
      }
    }
    return max;
  };

  $scope.compareVCSO = function (a, b) {
    if (a.SortOrder < b.SortOrder)
      return -1;
    if (a.SortOrder > b.SortOrder)
      return 1;
    return 0;
  }

 
  $scope.compareVCPOS = function (a, b) {
    if (a.Position < b.Position)
      return -1;
    if (a.Position > b.Position)
      return 1;
    return 0;
  }
}
]);