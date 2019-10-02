// App: KendoSAPInterface
var app = angular.module("KendoFTR", ["kendo.directives",  "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: SAPInterfaceCtrl
app.controller("FTRCtrl", ['$scope','$interval','$document',  'txt', 'kendoHelper', 'kendoOdsEnumerationTexts', 'refresh', 'kendoOdsUnits', 'kendoOdsMaterials',
function ($scope,$interval, $document,  txt, kendoHelper, kendoOdsEnumerationTexts, refresh, kendoOdsUnits, kendoOdsMaterials) {

  // Konstanten                                                        
  const TIMEINTERVAL_PER_DAY_MS = 86400000;

  const TIMEOUT_DELAY_DATABOUND = 500;  // notwendig um doppeltes Aufrufen zu vermeiden

  const BatchName = "Const_BatchName";
  const Material = "Const_Material";
  const Result = "Const_Result";
  const BrewLine = "Const_BrewLine";

  // interne Variablen
  var m_dataValuesInitialized = false;
  var m_dataFilterValuesInitialized = false;
  var m_dataSourceFilterFTRInitialized = false;
  var m_dataSourceFilterLineInitialized = false;
  var m_dataSourceFilterMaterialInitialized = false;
  var m_dataSourceValuesInitialized = false;

  //Footer
  var m_ResultTotal = 0;

  var m_ColumnsInitialized = false;

  var m_checkColumnNames = undefined;
  var m_checkColumns = undefined;

  //Aktualisierung
  var m_timeoutFTRValuesHandle = new Array();

  var m_HeaderLines = undefined;

  var m_Columns = new Array();
  var m_ColumnNamesGlobal = undefined;

  

 
  // DataSource für m_dataSourceFilterFTR
  var m_dataSourceFilterFTR = new kendo.data.DataSource({

    type: "odata-v4",
    transport: {
      read: {
        url: $("#gatewayPath").data("value") + "odata/ods/ZFTRHeaders?$select=_Key,FTRGlobalName,FTRLocalName",

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
      if (!m_dataSourceFilterFTRInitialized || !m_dataFilterValuesInitialized) {
        e.preventDefault();

        // Datenquelle wurde initialisiert
        m_dataSourceFilterFTRInitialized = true;

      }
    },
    schema: {
      model: {
        id: "_Key",
        fields: {
          "_Key": { type: "number" },
          "FTRLocalName": { type: "string"},
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

    return response;
  }
    },
    batch: false,
    serverPaging: true,
    serverSorting: true,
    serverFiltering: true
  });

  // DataSource für m_dataSourceFilterFTR
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

  // DataSource für m_dataSourceFilterFTR
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

  $scope.GetColumnNames = function() { return new kendo.data.DataSource({

    type: "odata-v4",
    transport: {
      read: {
        url: $("#gatewayPath").data("value") + "odata/ods/ZFTRConfigurations?$expand=ValueCategory%28$select=ValueCategoryGlobalName,ValueCategoryLocalName%29&$select=_ValueCategoryKey,_FTRHeaderKey,_Key,_SelfReferenceKey",

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
            result.$filter += " and _SelfReferenceKey eq null";    // Leere _Name ignorieren, dies muß hier gesetzt werden da Kendo Logik es beim Filter an dataSource entfernt
          }
          else {
            result.$filter = "_SelfReferenceKey eq null";    // Leere _Name ignorieren, dies muß hier gesetzt werden da Kendo Logik es beim Filter an dataSource entfernt
          }

          return result;
        }
      },
    },
    schema: {
      model: {
        id: "_Key",
        fields: {
          "_ValueCategoryKey": { type: "number" },
          "_FTRHeaderKey": { type: "number" },
          "_Key": { type: "number" },
          "_SelfReferenceKey": { type: "number" },
          "ValueCategoryGlobalName": { field: "ValueCategory.ValueCategoryGlobalName", type: "string", parse: function (value) { return (value === undefined) ? "" : value; } },
          "ValueCategoryLocalName": { field: "ValueCategory.ValueCategoryLocalName", type: "string", parse: function (value) { return (value === undefined) ? "" : value; } },
        }
      },
      parse: function (response) {

        m_HeaderLines = 0;

        
        if (response.value.length > 0) {
          for (var i = 0; i < response.value.length; i++) {

            var VCName = PCommonPortalMethods.GetSiteLanguage() == "en" && response.value[i].ValueCategory.ValueCategoryGlobalName != "" ? response.value[i].ValueCategory.ValueCategoryGlobalName : response.value[i].ValueCategory.ValueCategoryLocalName;

            var Start = VCName.indexOf(" ");

            if (VCName.substring(Start).length <= 18 && m_HeaderLines < 1) {
              m_HeaderLines = 1
            }
            if (VCName.substring(Start).length > 18 && VCName.substring(Start).length <= 36 && m_HeaderLines < 2) {
              m_HeaderLines = 2
            }
            if (VCName.substring(Start).length > 36 && m_HeaderLines < 3) {
              m_HeaderLines = 3
            }
          }
        }

       

        return response
      }
    },
    batch: false,
    serverPaging: true,
    serverSorting: true,
    serverFiltering: true

  });};

  // Datenquelle des Grids: FTRValues 
  $scope.GetDataSourceFTRValues = function() 
  {
    var ds ={
      type: "odata-v4",
      transport: {
        read: {
          url: $("#gatewayPath").data("value") + "odata/ods/ZWebFTRValues",
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
          
        },
       

        parse: function (response) {

          var pivotValue = new Array();

        

          if (response.value.length > 0) {

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

            //Werte bilden (Über die Columnnames, damit immer alle Felder belegt sind)
            for (var j = 0; j < $scope.m_ColumnNamesGlobal._data.length; j++) {
              for (var i = 0; i < pivotValue.length; i++) {

                var CurrentColumn = "VC_" + $scope.m_ColumnNamesGlobal._data[j]._ValueCategoryKey.toString()
                var CurrentColumnOOS = "VCOOS_" + $scope.m_ColumnNamesGlobal._data[j]._ValueCategoryKey.toString()


                pivotValue[i][CurrentColumn] = "-";
                pivotValue[i][CurrentColumnOOS] = 2;
                pivotValue[i][Result] = 100;
              }
            }

            //Werte pivotisieren und Result bilden
            for (var i = 0; i < response.value.length; i++) {

              for (var j = 0; j < pivotValue.length; j++) {

                var CurrentColumn = "VC_" + response.value[i]._ValueCategoryKey.toString()
                var CurrentColumnOOS = "VCOOS_" + response.value[i]._ValueCategoryKey.toString()
                if (pivotValue[j]._BatchKey == response.value[i]._BatchKey) {
                  pivotValue[j][CurrentColumn] = response.value[i].Value.toString() != undefined ? kendo.toString(response.value[i].Value, ((!response.value[i].Format) ? "n2" : response.value[i].Format)) : response.value[i].ValueString.toString();
                  pivotValue[j][CurrentColumnOOS] = response.value[i].OutOfSpec;
                  pivotValue[j][Result] = pivotValue[j][Result] == 0 ? pivotValue[j][Result] :
                    (response.value[i].OutOfSpec > 0 ? 0 : 100);
                 
                 
                  break;

                }
              }
            }
          }

          response.value = pivotValue;

          return response;
        }
      },
      aggregate: [{ field: Result, aggregate: "average" },
      { field: BatchName, aggregate: "count" }],
      batch: false,
      pageable: false,
      serverPaging: false,
      serverSorting: true,
      serverFiltering: true,
        sort: {
            field: "BatchName",
            dir: "asc"
        }
     
    };
    return new kendo.data.DataSource(ds);   
    
  };

  // DateTimePicker für Batchzeiten                                              
  $scope.dtFTREndTime = new Date();
  $scope.dtFTRStartTime = new Date($scope.dtFTREndTime - 30 * TIMEINTERVAL_PER_DAY_MS);          

    // Verweis auf Service      
  $scope.srv_kendoOdsEnumerationTexts = kendoOdsEnumerationTexts;

  $document.ready(function () {
    m_dataFilterValuesInitialized = false;
    $scope.cbFilterFTR = undefined;
    $scope.cbFilterLine = undefined;
    $scope.cbFilterMaterial = undefined;

    //$("#comboBoxFilterFTR").kendoComboBox({
    //  dataSource: m_dataSourceFilterFTR,
    //  dataTextField: "FTRName",
    //  dataValueField: "_Key"
    //});
    //$("#comboBoxFilterLine").kendoComboBox({
    //  dataSource: m_dataSourceFilterLine,
    //  dataTextField: "BatchTypeName",
    //  dataValueField: "_Key"
    //});
    //$("#comboBoxFilterMaterial").kendoComboBox({
    //  dataSource: m_dataSourceFilterMaterial,
    //  dataTextField: "MaterialName",
    //  dataValueField: "_Key"
    //});

    $("#comboBoxFilterFTR").data("kendoComboBox").setDataSource(m_dataSourceFilterFTR);
    $("#comboBoxFilterLine").data("kendoComboBox").setDataSource(m_dataSourceFilterLine);
    $("#comboBoxFilterMaterial").data("kendoComboBox").setDataSource(m_dataSourceFilterMaterial);

    kendoHelper.setDataSourceFilters(m_dataSourceFilterLine, "Classifications", "neq", ";;");
    kendoHelper.setDataSourceFilters(m_dataSourceFilterMaterial, "Classifications", "contains", ";MATERIALCLASS_WORT;");

    m_dataFilterValuesInitialized = true;

    m_dataSourceFilterFTR.read();
    m_dataSourceFilterLine.read();
    m_dataSourceFilterMaterial.read();

  });

  

  // ----------------------------------------
  // Defaultwerte für Filtereinstellungen
  $scope.cbFilterFTR = undefined;
  $scope.cbFilterLine = undefined;
  $scope.cbFilterMaterial = undefined;

  // ----------------------------------------
  // Optionen für comboBoxFilterFTR
  $scope.comboBoxFilterFTR = {
    dataTextField: "FTRName",
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
    delay: 200

  };

  // ----------------------------------------
  // Optionen für comboBoxFilterMaterial
  $scope.comboBoxFilterMaterial = {
    dataTextField: "MaterialName",
    dataValueField: "_Key",
    filter: "contains",
    minLength: 3,
    delay: 200

  };

  // Optionen für Grid FTRValues        
  $scope.GetGridFTRValuesOptions = function () {
    return {
      dataSource: $scope.GetDataSourceFTRValues(),
      scrollable: true,
      sortable: true,
      editable: false,
      resizable: true,
      selectable: true,
      //scrollable: false,
      //sortable: true,
      //editable: false,
      //resizable: true,
      //selectable: true,

      dataBound: function (e) {

        // Einfärben
        var headerCells = this.thead.find("th");
        var gridData = this.dataSource.view();

        for (var i = 0; i < gridData.length; i++) {
          for (var property in gridData[i]) {
            if (gridData[i].hasOwnProperty(property)) {
              if (property.indexOf("VCOOS_") != -1) {
                if (gridData[i][property] == 5) {
                  for (var j = 0; j < headerCells.length; j++) {
                    if (headerCells.eq(j).data("field") == "VC_" +  property.substring(6)) {
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellLVL");
                    }
                  }
                  }
                  if (gridData[i][property] == 6) {
                      for (var j = 0; j < headerCells.length; j++) {
                          if (headerCells.eq(j).data("field") == "VC_" + property.substring(6)) {
                              $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellLL");
                          }
                      }
                  }
                  if (gridData[i][property] == 7) {
                      for (var j = 0; j < headerCells.length; j++) {
                          if (headerCells.eq(j).data("field") == "VC_" + property.substring(6)) {
                              $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellUL");
                          }
                      }
                  }
                  if (gridData[i][property] == 8) {
                      for (var j = 0; j < headerCells.length; j++) {
                          if (headerCells.eq(j).data("field") == "VC_" + property.substring(6)) {
                              $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellUVL");
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

              if (property.indexOf(Result) != -1) {
                for (var j = 0; j < headerCells.length; j++) {
                  if (headerCells.eq(j).data("field") == Result) {
                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellResult");
                  }
                }

              }

            }
          }
        }
      },
    };
  };

  //Rebind flag setzten (Bool, dann kann einfach mit true und false getriggert werden)
  $scope.doRebind = false;

  //$scope.gridFTRValues = $scope.GetGridFTRValuesOptions();

  // FilterLine delete
  $scope.OnLoadValues = function () {
    // DataSource für m_ColumnNames
    
    var m_ColumnNames = $scope.GetColumnNames();

    if ($scope.cbFilterFTR != undefined) {
      
      $scope.gridFTRValues = $scope.GetGridFTRValuesOptions();
      $scope.gridFTRValues.dataSource = $scope.GetDataSourceFTRValues();

      // Sperren
      m_dataValuesInitialized = false;
      // Filter setzen
      kendoHelper.setDataSourceFilters($scope.gridFTRValues.dataSource, "_FTRHeaderKey", "eq", $scope.cbFilterFTR._Key);
      kendoHelper.setDataSourceFilters(m_ColumnNames, "_FTRHeaderKey", "eq", $scope.cbFilterFTR._Key);

      if ($scope.cbFilterMaterial != undefined) {
        kendoHelper.setDataSourceFilters($scope.gridFTRValues.dataSource, "_MaterialKey", "eq", $scope.cbFilterMaterial._Key);
      }

      if ($scope.cbFilterLine != undefined) {
        kendoHelper.setDataSourceFilters($scope.gridFTRValues.dataSource, "_BatchTypeKey", "eq", $scope.cbFilterLine._Key);
      }

      kendoHelper.setDataSourceFilters($scope.gridFTRValues.dataSource, "StartTime", "gte", $scope.dtFTRStartTime);
      kendoHelper.setDataSourceFilters($scope.gridFTRValues.dataSource, "StartTime", "lte", $scope.dtFTREndTime);

      // Werte initialisiert
      m_dataValuesInitialized = true;
     

      m_ColumnNames.read();
      m_ColumnsInitialized = false;
      m_checkColumnNames = $interval(function () {
        if (m_ColumnNames._data.length > 0) {

          $scope.m_ColumnNamesGlobal = m_ColumnNames 

          m_Columns = new Array();


          m_Columns.push({
            field: Material,
            title: txt.TXT_MATERIAL,
            width: "130px",
            locked: true,
          });

          m_Columns.push({
            field: BatchName,
            title: txt.TXT_BATCH_NAME,
            template: '<div style="text-align: center"> #= Const_BatchName # </div>',
            locked: true,
            width: "120px",
            footerTemplate: '<div style="text-align: center">Count: #= count # </div>',
          });
          m_Columns.push({
            field: BrewLine,
            title: txt.TXT_BREWLINE,
            template: '<div style="text-align: center"> #= Const_BrewLine # </div>',
            width: "80px",
            locked: true,
          });

          for (var i = 0; i < m_ColumnNames._data.length; i++) {
            var template = '<a style="color: inherit" href="DrillIn?BatchKey=#=getBatchKey(data)#&ConfigKey='+ m_ColumnNames._data[i]._Key +'" target="_blank" >#=' + "VC_" + m_ColumnNames._data[i]._ValueCategoryKey.toString() + ' #</a>';
            var footertemplate = '<div style="text-align: center">#= kendo.toString(doMath("' + "VCOOS_" + m_ColumnNames._data[i]._ValueCategoryKey.toString() + '"), "n2") # %</div>';

            var Offset = 0;

            var VCName = PCommonPortalMethods.GetSiteLanguage() == "en" && m_ColumnNames._data[i].ValueCategoryGlobalName != "" ?
                m_ColumnNames._data[i].ValueCategoryGlobalName : (m_ColumnNames._data[i].ValueCategoryLocalName != "" ? m_ColumnNames._data[i].ValueCategoryLocalName : m_ColumnNames._data[i].ValueCategoryGlobalName);

            var Start = VCName.indexOf(" ");

            var headertemplate = '<div style="text-align: center">' + VCName.substring(0, Start) + '</div>';
          
            for (var j = 0; j < m_HeaderLines; j++) {
              if (VCName != undefined || VCName.substring(Start + Offset).substring(j * 18, (j + 1) * 18) != undefined) {

                if (VCName.substring(Start + Offset).substr((j + 1) * 18, 1) == " " || VCName.substring(Start + Offset).substr((j + 1) * 18, 1) == ""
                  || VCName.substring(Start + Offset).substr(((j + 1) * 18) - 1, 1) == " " || VCName.substring(Start + Offset).substr(((j + 1) * 18) - 1, 1) == "") {

                  var headstr = VCName.substring(Start + Offset).substring(j * 18, (j + 1) * 18) != undefined && VCName.substring(Start + Offset).substring(j * 18, (j + 1) * 18) != "" ? VCName.substring(Start + Offset).substring(j * 18, (j + 1) * 18) : "&nbsp";

                  headertemplate = headertemplate + '<div style="text-align: center">' + headstr + '</div>';
                }
                else if (VCName.substring(Start + Offset).substr(((j + 1) * 18) + 1, 1) == " " || VCName.substring(Start + Offset).substr(((j + 1) * 18) + 1, 1) == "") {

                  var headstr = VCName.substring(Start + Offset).substring(j * 18, ((j + 1) * 18) + 1) != undefined && VCName.substring(Start + Offset).substring(j * 18, ((j + 1) * 18) + 1) != "" ? VCName.substring(Start + Offset).substring(j * 18, ((j + 1) * 18) + 1) : "&nbsp";
                  headertemplate = headertemplate + '<div style="text-align: center">' + headstr + '</div>';
                  Offset = Offset + 1;
                }
                else if (VCName.substring(Start + Offset).substr(((j + 1) * 18) - 2, 1) == " " || VCName.substring(Start + Offset).substr(((j + 1) * 18) - 2, 1) == "") {

                  var headstr = VCName.substring(Start + Offset).substring(j * 18, ((j + 1) * 18) - 2) != undefined && VCName.substring(Start + Offset).substring(j * 18, ((j + 1) * 18) - 2) != "" ? VCName.substring(Start + Offset).substring(j * 18, ((j + 1) * 18) - 2) : "&nbsp";
                  headertemplate = headertemplate + '<div style="text-align: center">' + headstr + '</div>';
                  Offset = Offset - 1;
                }

                else {
                  var headstr = VCName.substring(Start + Offset).substring(j * 18, (j + 1) * 18) != undefined && VCName.substring(Start + Offset).substring(j * 18, (j + 1) * 18) != "" ? VCName.substring(Start + Offset).substring(j * 18, (j + 1) * 18) : "&nbsp";

                  headertemplate = headertemplate + '<div style="text-align: center">' + headstr + '-</div>';;
                }

              }
              }
            
     
            m_Columns.push({
              field: "VC_" + m_ColumnNames._data[i]._ValueCategoryKey.toString(),
              //title: PCommonPortalMethods.GetSiteLanguage() == "en" && m_ColumnNames._data[i].ValueCategoryGlobalName != "" ?
              //  m_ColumnNames._data[i].ValueCategoryGlobalName : (m_ColumnNames._data[i].ValueCategoryLocalName != "" ? m_ColumnNames._data[i].ValueCategoryLocalName : m_ColumnNames._data[i].ValueCategoryGlobalName),
              width: "130px",
              attributes: { "class": "ob-center" },
              template: template,
              footerTemplate: footertemplate,
              headerTemplate: headertemplate
            });
          };

          m_Columns.push({
            field: Result,
            title: txt.TXT_RESULT,
            width: "130px",
            aggregates: ["count"],
            attributes: { "class": "ob-center" },
            footerTemplate: '<div style="text-align: center">#= kendo.toString(average, "n2") # %</div>',
            template: '#= kendo.toString(Const_Result, "n2")#  %'
          });


          m_ColumnsInitialized = true;
          $interval.cancel(m_checkColumnNames);
        }

       

      }, 100);
      

      m_checkColumns = $interval(function () {
        if (m_ColumnsInitialized) {
          $scope.gridFTRValues.columns = m_Columns;
          $scope.gridFTRValues.dataSource.read();
          $scope.doRebind = !$scope.doRebind;
          m_ColumnsInitialized = false;
          $interval.cancel(m_checkColumns);
        }
      }, 100);

    }
   

    doMath = function (columnField) {
      var data = $scope.gridFTRValues.dataSource._data;
      var correctValues = 0;
      for (var i = 0; i < data.length; i++) {
        if (data[i][columnField] == 0) {
          correctValues = correctValues + 1;  
        } ;
      }
      return (correctValues / data.length) * 100;
    }

    getBatchKey = function (data) {
      return data._BatchKey;
    };

   
  }

  // FilterLine delete
  $scope.OnFilterLineDelete = function () {
    $scope.cbFilterLine = undefined;
  }

  // FilterMaterial delete
  $scope.OnFilterMaterialDelete = function () {
    $scope.cbFilterMaterial = undefined;
  }

}
]);