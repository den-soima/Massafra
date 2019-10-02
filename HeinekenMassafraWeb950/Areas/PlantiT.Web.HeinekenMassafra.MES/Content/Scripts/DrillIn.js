// App: KendoSAPInterface
var app = angular.module("KendoDrillIn", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"]);

// Controller: SAPInterfaceCtrl
app.controller("DrillInCtrl", ['$scope','$interval','$document', 'ngDialog', 'txt', 'kendoHelper', 'kendoOdsEnumerationTexts', 'refresh', 'kendoOdsUnits', 'kendoOdsMaterials',
function ($scope,$interval, $document, ngDialog, txt, kendoHelper, kendoOdsEnumerationTexts, refresh, kendoOdsUnits, kendoOdsMaterials) {

  // Konstanten                                                        
  const TIMEINTERVAL_PER_DAY_MS = 86400000;

  const TIMEOUT_DELAY_DATABOUND = 500;  // notwendig um doppeltes Aufrufen zu vermeiden

  const BATCHKEY = $("#batchKey").data("value");
  const CONFIGKEY = $("#configKey").data("value");

  var m_dataValuesInitialized = false;
  var m_dataSourceDrillInHeader = undefined;
  var m_dataSourceDrillInValue = undefined;


  $scope.BatchName = undefined;
  $scope.FTRReport = undefined;

  $scope.BatchName = "Default batch";
  $scope.FTRReport = "Default report";


  // Datenquelle der Grids: DrillIn
  var f_GetDataSourceGrids = function () {
    var ds =

    {
    type: "odata-v4",
    transport: {
      read: {
        url: $("#gatewayPath").data("value") + "odata/ods/ZWebDrillInValues",
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
      }
    },
    requestStart: function (e) {
      // Wenn noch nicht initialisiert, abbruch
      if (!m_dataValuesInitialized || !m_dataSourceDrillInInitialized) {
        e.preventDefault();

        // Datenquelle wurde initialisiert
        m_dataSourceDrillInInitialized = true;

      }
    },
    schema: {
      model: {
        id: "_Key",
        fields: {
          "_Key"                                    : { type: "number" },
          "_FTRHeaderKey"                     : { type: "number" },
          "_ConfigKey"                     : { type: "number" },
          "_ConfigSelfReferenceKey"                     : { type: "number" },
          "_BatchKey"                    : { type: "number" },
          "Value"                     : { type: "number" },
          "ValueString"                     : { type: "string" },
          "LowerLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
          "LowerVetoLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
          "UpperLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
          "UpperVetoLimit": { type: "number", parse: function (value) { return (value === null) ? undefined : value; } },
          "SetpointValueRecipe"                     : { type: "number" },
          "SetpointValueRunning"                     : { type: "number" },         
          "ValueCategoryGlobalName"                     : { type: "string" },
          "ValueCategoryLocalName": { type: "string" },
          "Comment": { type: "string" },
          "FTRHeaderGlobalName": { type: "string" },
          "FTRHeaderLocalName": { type: "string" },
          "BatchName": { type: "string" },
          "ValueCategoryName": { type: "string" },
          "FTRHeaderName": { type: "string" },
          "Format": { type: "string" },
          "UnitOfMeasurement": { type: "string" },
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
          PCommonPortalMethods.GetSiteLanguage() == "en" ? value.ValueCategoryGlobalName : value.ValueCategoryLocalName;
          value.FTRHeaderName =
          PCommonPortalMethods.GetSiteLanguage() == "en" ? value.FTRHeaderGlobalName : value.FTRHeaderLocalName;
        }

        
        $scope.BatchName = response.value[0].BatchName.substring(0, response.value[0].BatchName.indexOf("."));
        $scope.FTRReport = response.value[0].FTRHeaderName;

        return response;
      }
    },
    batch: false,
    pageSize: 10,
    serverPaging: true,
    serverSorting: true,
    serverFiltering: true
    };


    ds = new kendo.data.DataSource(ds);
    return ds;
  };

  $scope.OnInitDrillInHeaders = function () {

    m_dataSourceDrillInHeader = f_GetDataSourceGrids();
    m_dataSourceDrillInValue = f_GetDataSourceGrids();


    // Filter setzen
    kendoHelper.setDataSourceFilters(m_dataSourceDrillInHeader, "_ConfigKey", "eq", CONFIGKEY);    // eq Kendo Operator
    kendoHelper.setDataSourceFilters(m_dataSourceDrillInValue, "_ConfigSelfReferenceKey", "eq", CONFIGKEY);       // eq Kendo Operator

    kendoHelper.setDataSourceFilters(m_dataSourceDrillInHeader, "_BatchKey", "eq", BATCHKEY);    // eq Kendo Operator
    kendoHelper.setDataSourceFilters(m_dataSourceDrillInValue, "_BatchKey", "eq", BATCHKEY);       // eq Kendo Operator


    // Werte initialisiert
    m_dataValuesInitialized = true;

    // Datenquelle zuweisen
    $scope.gridDrillInHeader.dataSource = m_dataSourceDrillInHeader;

    // Datenquelle lesen
    $scope.gridDrillInHeader.dataSource.read();

    // Datenquelle zuweisen
    $scope.gridDrillInValue.dataSource = m_dataSourceDrillInValue;

    // Datenquelle lesen
    $scope.gridDrillInValue.dataSource.read();
  };

  // Optionen für Grid DrillInHeader
  $scope.gridDrillInHeader = {
    // toolbar: ["pdf", "excel"],       // disabled due to bug in kendo ui 2015 
 
    dataBound: function (e) {     

      // ToolTip
      $scope.gridDrillInHeader.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
        $(this).attr('title', $(this).data('title'));
      })

      // Einfärben
      var headerCells = this.thead.find("th");
      var gridData = this.dataSource.view();

      for (var i = 0; i < gridData.length; i++) {
        // Wenn der Wert nicht bekannt ist, ignorieren
        if (gridData[i].Value === undefined)
          continue;

          var bUpperLimitViolation = false
          var bLowerLimitViolation = false
          var bUpperLimitVetoViolation = false
          var bLowerLimitVetoViolation = false

        for (var j = 0; j < headerCells.length; j++) {
          // Untergrenze
          if (headerCells.eq(j).data("field") == "LowerLimit") {
            if (gridData[i].LowerLimit === undefined)
              continue;

            if (gridData[i].Value < gridData[i].LowerLimit) {
                bLowerLimitViolation = true;
                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellLL");
            }
          }
          // Obergrenze
          if (headerCells.eq(j).data("field") == "UpperLimit") {
            if (gridData[i].UpperLimit === undefined)
              continue;

            if (gridData[i].Value > gridData[i].UpperLimit) {
                bUpperLimitViolation = true;
                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellUL");
            }
          }
          // Untergrenze (Plus)
          if (headerCells.eq(j).data("field") == "LowerVetoLimit") {
            if (gridData[i].LowerVetoLimit === undefined)
              continue;

            if (gridData[i].Value < gridData[i].LowerVetoLimit) {
                bLowerLimitVetoViolation = true;
                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellLVL");
            }
          }
          // Obergrenze (Plus)
          if (headerCells.eq(j).data("field") == "UpperVetoLimit") {
            if (gridData[i].UpperVetoLimit === undefined)
              continue;

            if (gridData[i].Value > gridData[i].UpperVetoLimit) {
                bUpperLimitVetoViolation = true;
                $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellUVL");
            }
          }
        }

          if (bLowerLimitVetoViolation || bUpperLimitVetoViolation || bLowerLimitViolation || bUpperLimitViolation) {
          for (var j = 0; j < headerCells.length; j++) {
            // Untergrenze
            if (headerCells.eq(j).data("field") == "Value") {
                if (bLowerLimitVetoViolation) {
                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellLVL");
                break;
              }
                else if (bUpperLimitVetoViolation) {
                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellUVL");
                break;
                } else if (bLowerLimitViolation) {
                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellLL");
                    break;
                } else if (bUpperLimitViolation) {
                    $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellUL");
                    break;
                }
            }
          }
        }
      }

    },
    scrollable: true,
    sortable: true,
    resizable: true,
    selectable: true,
    autoBind: false,
    columns: [
   {
      field: "ValueCategoryName",
      title: txt.TXT_VARIABLE,
    
     
    }, {
      field: "Value",
      title: txt.TXT_VALUE,
      attributes: {
        style: "text-align: center;"
      },
      template: function (data) {
        if (data.Value || data.Value == 0) {
          if (data.Value != null) {
            return kendo.toString(data.Value, ((!data.Format) ? "n2" : data.Format));
          }
          else {
            return null;
          }
        }
        else {
          return '';
        }
      }
    }, {
      field: "LowerVetoLimit",
      title: txt.TXT_VALUE_LVL,
      attributes: {
        style: "text-align: center;"
      },
      template: function (data) {
        if (data.LowerVetoLimit || data.LowerVetoLimit == 0) {
          if (data.LowerVetoLimit != null) {
            return kendo.toString(data.LowerVetoLimit, ((!data.Format) ? "n2" : data.Format));
          }
          else {
            return null;
          }
        }
        else {
          return '';
        }
      }
    }, {
      field: "LowerLimit",
      title: txt.TXT_VALUE_LL,
      attributes: {
        style: "text-align: center;"
      },
      template: function (data) {
        if (data.LowerLimit || data.LowerLimit == 0) {
          if (data.LowerLimit != null) {
            return kendo.toString(data.LowerLimit, ((!data.Format) ? "n2" : data.Format));
          }
          else {
            return null;
          }
        }
        else {
          return '';
        }
      }
    }, {
      field: "SetpointValueRecipe",
      title: txt.TXT_VALUE_SPRE,
      attributes: {
        style: "text-align: center;"
      },
      template: function (data) {
        if (data.SetpointValueRecipe || data.SetpointValueRecipe == 0) {
          if (data.SetpointValueRecipe != null) {
            return kendo.toString(data.SetpointValueRecipe, ((!data.Format) ? "n2" : data.Format));
          }
          else {
            return null;
          }
        }
        else {
          return '';
        }
      }
    }, {
      field: "SetpointValueRunning",
      title: txt.TXT_VALUE_SPRU,
      attributes: {
        style: "text-align: center;"
      },
      template: function (data) {
        if (data.SetpointValueRunning || data.SetpointValueRunning == 0) {
          if (data.SetpointValueRunning != null) {
            return kendo.toString(data.SetpointValueRunning, ((!data.Format) ? "n2" : data.Format));
          }
          else {
            return null;
          }
        }
        else {
          return '';
        }
      }
    }, {
      field: "UpperLimit",
      title: txt.TXT_VALUE_UL,
      attributes: {
        style: "text-align: center;"
      },
      template: function (data) {
        if (data.UpperLimit || data.UpperLimit == 0) {
          if (data.UpperLimit != null) {
            return kendo.toString(data.UpperLimit, ((!data.Format) ? "n2" : data.Format));
          }
          else {
            return null;
          }
        }
        else {
          return '';
        }
      }
    }, {
      field: "UpperVetoLimit",
      title: txt.TXT_VALUE_UVL,
      attributes: {
        style: "text-align: center;"
      },
      template: function (data) {
        if (data.UpperVetoLimit || data.UpperVetoLimit == 0) {
          if (data.UpperVetoLimit != null) {
            return kendo.toString(data.UpperVetoLimit, ((!data.Format) ? "n2" : data.Format));
          }
          else {
            return null;
          }
        }
        else {
          return '';
        }
      }
    }, ]
  };


  getBatchKey = function (data) {
    return BATCHKEY;
  };

  getConfigKey = function (data) {
    return data._ConfigKey;
  };

  // Optionen für Grid DrillInValue
  $scope.gridDrillInValue = {


    dataBound: function (e) {

      // ToolTip
      $scope.gridDrillInValue.tbody.closest('div[kendo-grid]').find('thead tr th').each(function () {
        $(this).attr('title', $(this).data('title'));
      })

      // Einfärben
      var headerCells = this.thead.find("th");
      var gridData = this.dataSource.view();

      for (var i = 0; i < gridData.length; i++) {
        // Wenn der Wert nicht bekannt ist, ignorieren
        if (gridData[i].Value === undefined)
          continue;

          var bUpperLimitViolation = false
          var bLowerLimitViolation = false
          var bUpperLimitVetoViolation = false
          var bLowerLimitVetoViolation = false

          for (var j = 0; j < headerCells.length; j++) {
              // Untergrenze
              if (headerCells.eq(j).data("field") == "LowerLimit") {
                  if (gridData[i].LowerLimit === undefined)
                      continue;

                  if (gridData[i].Value < gridData[i].LowerLimit) {
                      bLowerLimitViolation = true;
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellLL");
                  }
              }
              // Obergrenze
              if (headerCells.eq(j).data("field") == "UpperLimit") {
                  if (gridData[i].UpperLimit === undefined)
                      continue;

                  if (gridData[i].Value > gridData[i].UpperLimit) {
                      bUpperLimitViolation = true;
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellUL");
                  }
              }
              // Untergrenze (Plus)
              if (headerCells.eq(j).data("field") == "LowerVetoLimit") {
                  if (gridData[i].LowerVetoLimit === undefined)
                      continue;

                  if (gridData[i].Value < gridData[i].LowerVetoLimit) {
                      bLowerLimitVetoViolation = true;
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellLVL");
                  }
              }
              // Obergrenze (Plus)
              if (headerCells.eq(j).data("field") == "UpperVetoLimit") {
                  if (gridData[i].UpperVetoLimit === undefined)
                      continue;

                  if (gridData[i].Value > gridData[i].UpperVetoLimit) {
                      bUpperLimitVetoViolation = true;
                      $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellUVL");
                  }
              }
          }

          if (bLowerLimitVetoViolation || bUpperLimitVetoViolation || bLowerLimitViolation || bUpperLimitViolation) {
              for (var j = 0; j < headerCells.length; j++) {
                  // Untergrenze
                  if (headerCells.eq(j).data("field") == "Value") {
                      if (bLowerLimitVetoViolation) {
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellLVL");
                          break;
                      }
                      else if (bUpperLimitVetoViolation) {
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellUVL");
                          break;
                      } else if (bLowerLimitViolation) {
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellLL");
                          break;
                      } else if (bUpperLimitViolation) {
                          $(this.table.find("tr[data-uid='" + gridData[i].uid + "']").children("td")[j]).addClass("gridCellUL");
                          break;
                      }
                  }
              }
          }
      }

    },
    scrollable: true,
    sortable: true,
    resizable: true,
    selectable: true,
    autoBind: false,

    pageable: {
      pageSize: 10,
      pageSizes: true,
      buttonCount: 5
    },

    columns: [
   {
     field: "ValueCategoryName",
     title: txt.TXT_VARIABLE,
     template: '<a style="color: inherit" href="DrillIn?BatchKey=#=getBatchKey(data)#&ConfigKey=#=getConfigKey(data)#" target="_self" >#=ValueCategoryName #</a>'

   }, {
     field: "Value",
     title: txt.TXT_VALUE,
     attributes: {
       style: "text-align: center;"
     },
     template: function (data) {
       if (data.Value || data.Value == 0) {
         if (data.Value != null) {
           return kendo.toString(data.Value, ((!data.Format) ? "n2" : data.Format));
         }
         else {
           return null;
         }
       }
       else {
         return '';
       }
     }
   }, {
     field: "LowerVetoLimit",
     title: txt.TXT_VALUE_LVL,
     attributes: {
       style: "text-align: center;"
     },
     template: function (data) {
       if (data.LowerVetoLimit || data.LowerVetoLimit == 0) {
         if (data.LowerVetoLimit != null) {
           return kendo.toString(data.LowerVetoLimit, ((!data.Format) ? "n2" : data.Format));
         }
         else {
           return null;
         }
       }
       else {
         return '';
       }
     }
   }, {
     field: "LowerLimit",
     title: txt.TXT_VALUE_LL,
     attributes: {
       style: "text-align: center;"
     },
     template: function (data) {
       if (data.LowerLimit || data.LowerLimit == 0) {
         if (data.LowerLimit != null) {
           return kendo.toString(data.LowerLimit, ((!data.Format) ? "n2" : data.Format));
         }
         else {
           return null;
         }
       }
       else {
         return '';
       }
     }
   }, {
     field: "SetpointValueRecipe",
     title: txt.TXT_VALUE_SPRE,
     attributes: {
       style: "text-align: center;"
     },
     template: function (data) {
       if (data.SetpointValueRecipe || data.SetpointValueRecipe == 0) {
         if (data.SetpointValueRecipe != null) {
           return kendo.toString(data.SetpointValueRecipe, ((!data.Format) ? "n2" : data.Format));
         }
         else {
           return null;
         }
       }
       else {
         return '';
       }
     }
   }, {
     field: "SetpointValueRunning",
     title: txt.TXT_VALUE_SPRU,
     attributes: {
       style: "text-align: center;"
     },
     template: function (data) {
       if (data.SetpointValueRunning || data.SetpointValueRunning == 0) {
         if (data.SetpointValueRunning != null) {
           return kendo.toString(data.SetpointValueRunning, ((!data.Format) ? "n2" : data.Format));
         }
         else {
           return null;
         }
       }
       else {
         return '';
       }
     }
   }, {
     field: "UpperLimit",
     title: txt.TXT_VALUE_UL,
     attributes: {
       style: "text-align: center;"
     },
     template: function (data) {
       if (data.UpperLimit || data.UpperLimit == 0) {
         if (data.UpperLimit != null) {
           return kendo.toString(data.UpperLimit, ((!data.Format) ? "n2" : data.Format));
         }
         else {
           return null;
         }
       }
       else {
         return '';
       }
     }
   }, {
     field: "UpperVetoLimit",
     title: txt.TXT_VALUE_UVL,
     attributes: {
       style: "text-align: center;"
     },
     template: function (data) {
       if (data.UpperVetoLimit || data.UpperVetoLimit == 0) {
         if (data.UpperVetoLimit != null) {
           return kendo.toString(data.UpperVetoLimit, ((!data.Format) ? "n2" : data.Format));
         }
         else {
           return null;
         }
       }
       else {
         return '';
       }
     }
   }, ]
  };


}
]);