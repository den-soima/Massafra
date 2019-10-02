/* Handling für Ods Datenquellen  */
var modKendoOds = angular.module('app.kendoOds', ["app.kendoHelper"])


/* Enumeration  */
modKendoOds.factory("kendoOdsEnumerations", ['kendoHelper', function (kendoHelper) {
                           
  var m_dataSource = undefined;  // Array mit allen bereits gelesenen Datenquellen

  // -------------------------
  // Datenquelle des Grids: f_GetDataSourceElement (Hilfsfunktion)
  // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
  var f_GetDataSource = function () {

    if (!!m_dataSource)
      return m_dataSource;

    // sonst einfügen
    m_dataSource = f_GetDataSourceElement();

    // Filter/Sortierung setzen
    kendoHelper.setDataSourceFilters(m_dataSource, "_Name", "neq", "");
    if (PCommonPortalMethods.GetSiteLanguage() == "en") {
      kendoHelper.setDataSourceFilters(m_dataSource, "EnumerationGlobalName", "neq", "");
      kendoHelper.setDataSourceSorts(m_dataSource, "EnumerationGlobalName", "asc");
    }
    else {
      kendoHelper.setDataSourceFilters(m_dataSource, "EnumerationLocalName", "neq", "");
      kendoHelper.setDataSourceSorts(m_dataSource, "EnumerationLocalName", "asc");
    }

    // Element hinzufügen                           
    return m_dataSource;
  };

  // -------------------------
  // Datenquelle  
  var f_GetDataSourceElement = function () {
    return new kendo.data.DataSource({

      type: "odata-v4",
      transport: {
        read: {
          url: function () {
            if (PCommonPortalMethods.GetSiteLanguage() == "en") {
              return $("#gatewayPath").data("value") + "odata/ods/Enumerations?$select=_Key,EnumerationGlobalName,_Name";
            }
            else {
              return $("#gatewayPath").data("value") + "odata/ods/Enumerations?$select=_Key,EnumerationLocalName,_Name";
            }
          },

          datatype: 'json',
          beforeSend: function (x) {
            var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
            x.setRequestHeader("Authorization", auth);
          }
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
            "_Name": { type: "string", editable: false },
            "EnumerationLocalName": { field: "EnumerationLocalName", type: "string", editable: false, parse: function (value) { return value || {}; } },
            "EnumerationGlobalName": { field: "EnumerationGlobalName", type: "string", editable: false, parse: function (value) { return value || {}; } }
          }
        }       
      },
      batch: false,
      serverPaging: false,
      serverSorting: true,
      serverFiltering: true

    });
  };

  // -------------------------
  // Setzt Enum Filter   
  var f_SetFilterUi = function (element) {
    var dataTextField = "EnumerationGlobalName";
    var dataSource = f_GetDataSource();

    if (dataSource) {

      if (PCommonPortalMethods.GetSiteLanguage() != "en") {
        dataTextField = "EnumerationLocalName";
      }

      element.kendoAutoComplete({
        dataSource: dataSource,
        dataTextField: dataTextField,
        dataValueField: "_Name",
        minLength: 2
      });
    }
  };
             

  // -------------------------
  // Ermittelt Enum 
  var f_Get = function (name) {
    // Falls kein Wert übergeben, dann alle liefern
    if (name === undefined)
      name = "";

    // Falls keine Datenquelle für Status gefunden, Nummer liefern
    if (name === undefined)
      return {};

    // Datenquelle ermitteln, falls keine Daten in Datenquelle für Status gefunden, Nummer liefern
    var dataSource = f_GetDataSource();
    if (!dataSource && !dataSource._data)
      return name;

    //  auslesen und zurückgeben
    for (var i = 0; i < dataSource._data.length; i++) {

      if (dataSource._data[i]._Name == name) {
        if (PCommonPortalMethods.GetSiteLanguage() != "en") {
          return kendo.htmlEncode(dataSource._data[i].EnumerationLocalName);
        }
        return kendo.htmlEncode(dataSource._data[i].EnumerationGlobalName);
      }
    }
      
    // Falls kein  gefunden, Name liefern
    return name;
  }

  // -------------------------
  // Initialisiert Datenquelle, notwendig wenn Daten async. geladen werden und bei Verwendung schon verfügbar sein müssen
  var f_Init = function () {
    // Datenquelle ermitteln, falls keine Daten in Datenquelle für Status gefunden, Nummer liefern
    return dataSource = f_GetDataSource();

  }

  return {
    getDataSource: f_GetDataSource,
    get: f_Get,
    setFilterUi: f_SetFilterUi,
    init: f_Init
  }
}]);

/* EnumerationTexts  */
modKendoOds.factory("kendoOdsEnumerationTexts", ['kendoHelper', function (kendoHelper) {

    // Struktur: dataSourceElement 
    function c_dataSourceElement(enumName, dataSource) {
      this.enumName = enumName;
      this.dataSource = dataSource;
    };

    var m_dataSourceElements = new Array();  // Array mit allen bereits gelesenen Datenquellen

    // -------------------------
    // Datenquelle des Grids: f_GetDataSourceElement (Hilfsfunktion)
    // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
    var f_GetDataSource = function (enumName) {
      
      // Falls kein Wert übergeben, dann alle liefern
      if (enumName === undefined)
        enumName = "";

      if (!m_dataSourceElements)
        m_dataSourceElements = new Array();
      // wenn gefunden, entsprechendes Element zurückgeben
      for (var i = 0; i < m_dataSourceElements.length; i++) {
        if (m_dataSourceElements[i].enumName == enumName)
          return m_dataSourceElements[i].dataSource;
      }
      // sonst einfügen
      var newElement = new c_dataSourceElement(enumName, f_GetDataSourceElement());             

      // Filter/Sortierung setzen
      if (enumName != "")
        kendoHelper.setDataSourceFilters(newElement.dataSource, "Enumeration/_Name", "eq", enumName);
      if (PCommonPortalMethods.GetSiteLanguage() == "en") {
        kendoHelper.setDataSourceFilters(newElement.dataSource, "EnumerationTextGlobalName", "neq", "");
        kendoHelper.setDataSourceSorts(newElement.dataSource, "EnumerationTextGlobalName", "asc");
      }
      else {
        kendoHelper.setDataSourceFilters(newElement.dataSource, "EnumerationTextLocalName", "neq", "");
        kendoHelper.setDataSourceSorts(newElement.dataSource, "EnumerationTextLocalName", "asc");
      }

      // Element hinzufügen
      m_dataSourceElements.push(newElement);
      return newElement.dataSource;
    };

    // -------------------------
    // Datenquelle  
    var f_GetDataSourceElement = function () {
      return new kendo.data.DataSource({

        type: "odata-v4",
        transport: {
          read: {
            url: function () {
              if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                return $("#gatewayPath").data("value") + "odata/ods/EnumerationTexts?$expand=Enumeration&$select=_Key,TextNumber,EnumerationTextGlobalName";
              }
              else {
                return $("#gatewayPath").data("value") + "odata/ods/EnumerationTexts?$expand=Enumeration&$select=_Key,TextNumber,EnumerationTextLocalName";
              }
            },

            datatype: 'json',
            beforeSend: function (x) {
              var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
              x.setRequestHeader("Authorization", auth);
            }
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
              "TextNumber": { type: "number", editable: false },
              "EnumerationTextLocalName": { field: "EnumerationTextLocalName", type: "string", editable: false, parse: function (value) { return value || {}; } },
              "EnumerationTextGlobalName": { field: "EnumerationTextGlobalName", type: "string", editable: false, parse: function (value) { return value || {}; } }
            }
          }
        },
        batch: false,
        serverPaging: false,
        serverSorting: true,
        serverFiltering: true

      });
    };

    // -------------------------
    // Setzt Enum Filter   
    var f_SetFilterUi = function (element, enumName) {
      var dataTextField = "EnumerationTextGlobalName";
      var dataSource = f_GetDataSource(enumName);
            
      if (dataSource) {
 
        if (PCommonPortalMethods.GetSiteLanguage() != "en") {
          dataTextField = "EnumerationTextLocalName";
        }

        element.kendoDropDownList({
          dataSource: dataSource,
          dataTextField: dataTextField,
          dataValueField: "TextNumber"
        });
      }
    };

    // -------------------------
    // Ermittelt Enum Text
    var f_GetText = function (status, enumName) {
      // Falls kein Wert übergeben, dann alle liefern
      if (enumName === undefined)
        enumName = "";

      // Falls keine Datenquelle für Status gefunden, Nummer liefern
      if (status === undefined)
        return {};

      // Datenquelle ermitteln, falls keine Daten in Datenquelle für Status gefunden, Nummer liefern
      var dataSource = f_GetDataSource(enumName);
      if (!dataSource && !dataSource._data)
        return status;

      // Text auslesen und zurückgeben
      for (var i = 0; i < dataSource._data.length; i++) {

        if (parseInt(dataSource._data[i].TextNumber) == parseInt(status)) {
          if (PCommonPortalMethods.GetSiteLanguage() != "en") {
            return kendo.htmlEncode(dataSource._data[i].EnumerationTextLocalName);
          }
          return kendo.htmlEncode(dataSource._data[i].EnumerationTextGlobalName);
        }
      }


      // Falls kein Text gefunden, Nummer liefern
      return status;
    }

    // -------------------------
    // Initialisiert Datenquelle, notwendig wenn Daten async. geladen werden und bei Verwendung schon verfügbar sein müssen
    var f_Init = function (enumName) {
      // Falls kein Wert übergeben, dann alle liefern
      if (enumName === undefined)
        enumName = "";

      // Datenquelle ermitteln, falls keine Daten in Datenquelle für Status gefunden, Nummer liefern
      return dataSource = f_GetDataSource(enumName);
   
    }             

    return {
      getDataSource: f_GetDataSource,
      getText: f_GetText,
      setFilterUi: f_SetFilterUi,
      init: f_Init
    }
}]);


/* Units  */
modKendoOds.factory("kendoOdsUnits", ['kendoHelper', function (kendoHelper) {

  // Struktur: dataSourceElement 
  function c_dataSourceElement(unitClassName, Classifications, ClassificationsSources, ClassificationGT, dataSource) {
    this.unitClassName = unitClassName;
    this.dataSource = dataSource;
    this.Classifications = Classifications;
    this.ClassificationsSources = ClassificationsSources;
    this.ClassificationGT = ClassificationGT;

  };
  var m_dataSourceElements = new Array();  // Array mit allen bereits gelesenen Datenquellen

  // -------------------------
  // Datenquelle des Grids: f_GetDataSourceElement (Hilfsfunktion)
  // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
  var f_GetDataSource = function (unitClassName, Classifications, ClassificationsSources, ClassificationGT) {

    // Falls kein Wert übergeben, dann alle liefern
    if (unitClassName === undefined)
      unitClassName = "";

    // Falls kein Wert übergeben, dann alle liefern
    if (Classifications === undefined)
        Classifications = "";
        ClassificationsSources = "";
        ClassificationGT = "";


    if (!m_dataSourceElements)
      m_dataSourceElements = new Array();

    // wenn gefunden, entsprechendes Element zurückgeben
    for (var i = 0; i < m_dataSourceElements.length; i++) {
      if (m_dataSourceElements[i].unitClassName == unitClassName && m_dataSourceElements[i].Classifications.indexOf(Classifications) >= 0 && m_dataSourceElements[i].Classifications.indexOf(ClassificationsSources) >= 0 && m_dataSourceElements[i].Classifications.indexOf(ClassificationGT) >= 0)
        return m_dataSourceElements[i].dataSource;
    }                          
    // Element anlegen
    var newElement = new c_dataSourceElement(unitClassName, Classifications, ClassificationsSources, ClassificationGT, f_GetDataSourceElement());

    // Filter/Sortierung setzen
    if (unitClassName != "")
      kendoHelper.setDataSourceFilters(newElement.dataSource, "UnitClass/_Name", "eq", unitClassName);
    if (PCommonPortalMethods.GetSiteLanguage() == "en") {
      kendoHelper.setDataSourceFilters(newElement.dataSource, "UnitGlobalName", "neq", "");
      kendoHelper.setDataSourceSorts(newElement.dataSource, "UnitGlobalName", "asc");
    }           
    else {
      kendoHelper.setDataSourceFilters(newElement.dataSource, "UnitLocalName", "neq", "");
      kendoHelper.setDataSourceSorts(newElement.dataSource, "UnitLocalName", "asc");
    }      

    if (Classifications != "")
       kendoHelper.setDataSourceFilters(newElement.dataSource, "UnitClass/Classifications", "contains", Classifications);

    if(ClassificationsSources != "")
       kendoHelper.setDataSourceFilters(newElement.dataSource, "UnitClass/Classifications", "contains", ClassificationsSources);

    if(ClassificationGT != "")
       kendoHelper.setDataSourceFilters(newElement.dataSource, "UnitClass/Classifications", "contains", ClassificationGT);


                                                              

    // Element hinzufügen
    m_dataSourceElements.push(newElement);
    return newElement.dataSource;

  };

  // -------------------------
  // Datenquelle für Status
  var f_GetDataSourceElement = function () {
    return new kendo.data.DataSource({

      type: "odata-v4",
      transport: {
        read: {
          url: function () {
            if (PCommonPortalMethods.GetSiteLanguage() == "en") {
              return $("#gatewayPath").data("value") + "odata/ods/Units?$expand=UnitClass&$select=_Key,UnitGlobalName";
            }
            else {
              return $("#gatewayPath").data("value") + "odata/ods/Units?$expand=UnitClass&$select=_Key,UnitLocalName";
            }
          },

          datatype: 'json',
          beforeSend: function (x) {
            var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
            x.setRequestHeader("Authorization", auth);
          }
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
            "UnitGlobalName": { field: "UnitGlobalName", type: "string", editable: false, parse: function (value) { return value || {}; } },
            "UnitLocalName": { field: "UnitLocalName", type: "string", editable: false, parse: function (value) { return value || {}; } }
          }
        }
      },
      batch: false,
      serverPaging: false,
      serverSorting: true,
      serverFiltering: true

    });
  };

  var f_SetFilterUi = function (element, unitClassName) {
    var dataTextField = "UnitGlobalName";
    var dataSource = f_GetDataSource(unitClassName);

    if (dataSource) {

      if (PCommonPortalMethods.GetSiteLanguage() != "en") {
        dataTextField = "UnitLocalName";
      }

      element.kendoAutoComplete({
        dataSource: dataSource,
        dataTextField: dataTextField,
        dataValueField: "_UnitKey",
        minLength: 2 
      });
    }
  };

  var f_GetText = function (status, unitClassName) {
    // Falls kein Wert übergeben, dann alle liefern
    if (unitClassName === undefined)
      unitClassName = "";

    // Falls keine Datenquelle für Status gefunden, Nummer liefern
    if (status === undefined)
      return {};

    // Datenquelle ermitteln, falls keine Daten in Datenquelle für Status gefunden, Nummer liefern
    var dataSource = f_GetDataSource(unitClassName);
    if (!dataSource && !dataSource._data)
      return status;

    // Text auslesen und zurückgeben
    for (var i = 0; i < dataSource._data.length; i++) {

      if (parseInt(dataSource._data[i].TextNumber) == parseInt(status)) {
        if (PCommonPortalMethods.GetSiteLanguage() != "en") {
          return kendo.htmlEncode(dataSource._data[i].UnitLocalName);
        }
        return kendo.htmlEncode(dataSource._data[i].UnitGlobalName);
      }
    }


    // Falls kein Text gefunden, Nummer liefern
    return status;
  }
        
  // -------------------------
  // Initialisiert Datenquelle, notwendig wenn Daten async. geladen werden und bei Verwendung schon verfügbar sein müssen
  var f_Init = function (unitClassName,Classifications) {
    // Falls kein Wert übergeben, dann alle liefern
    if (unitClassName === undefined)
      unitClassName = "";
    
    // Falls kein Wert übergeben, dann alle liefern
    if (Classifications === undefined)
        Classifications = "";
        ClassificationsSources = "";
        ClassificationGT = "";

    // Datenquelle ermitteln, falls keine Daten in Datenquelle für Status gefunden, Nummer liefern
    return dataSource = f_GetDataSource(unitClassName, Classifications, ClassificationGT);
    
  }     

  return {
    getDataSource: f_GetDataSource,
    getText: f_GetText,
    setFilterUi: f_SetFilterUi,  
    init: f_Init
  }
}]);

/* Materials  */
modKendoOds.factory("kendoOdsMaterials", ['kendoHelper', function (kendoHelper) {

  // Struktur: dataSourceElement 
  function c_dataSourceElement(materialClassName, dataSource) {
    this.materialClassName = materialClassName;
    this.dataSource = dataSource;
  };

  var m_dataSourceElements = new Array();  // Array mit allen bereits gelesenen Datenquellen

  // -------------------------
  // Datenquelle des Grids: f_GetDataSourceElement (Hilfsfunktion)
  // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
  var f_GetDataSource = function (materialClassName) {

    // Falls kein Wert übergeben, dann alle liefern
    if (materialClassName === undefined)
      materialClassName = "";

    if (!m_dataSourceElements)
      m_dataSourceElements = new Array();
    // wenn gefunden, entsprechendes Element zurückgeben
    for (var i = 0; i < m_dataSourceElements.length; i++) {
      if (m_dataSourceElements[i].materialClassName == materialClassName)
        return m_dataSourceElements[i].dataSource;
    }
    // Element anlegen
    var newElement = new c_dataSourceElement(materialClassName, f_GetDataSourceElement());

    // Filter/Sortierung setzen
    if (materialClassName != "")
      kendoHelper.setDataSourceFilters(newElement.dataSource, "MaterialClass/_Name", "eq", materialClassName);
    if (PCommonPortalMethods.GetSiteLanguage() == "en") {
      kendoHelper.setDataSourceFilters(newElement.dataSource, "MaterialGlobalName", "neq", "");
      kendoHelper.setDataSourceSorts(newElement.dataSource, "MaterialGlobalName", "asc");
    }
    else {
      kendoHelper.setDataSourceFilters(newElement.dataSource, "MaterialLocalName", "neq", "");
      kendoHelper.setDataSourceSorts(newElement.dataSource, "MaterialLocalName", "asc");
    }             
    
    // Element hinzufügen
    m_dataSourceElements.push(newElement);
    return newElement.dataSource;
  };

  // -------------------------
  // Datenquelle für Status
  var f_GetDataSourceElement = function () {
    return new kendo.data.DataSource({

      type: "odata-v4",
      transport: {
        read: {
          url: function () {
            if (PCommonPortalMethods.GetSiteLanguage() == "en") {
              return $("#gatewayPath").data("value") + "odata/ods/Materials?$expand=MaterialClass&$select=_Key,MaterialGlobalName";
            }
            else {
              return $("#gatewayPath").data("value") + "odata/ods/Materials?$expand=MaterialClass&$select=_Key,MaterialLocalName";
            }
          },

          datatype: 'json',
          beforeSend: function (x) {
            var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
            x.setRequestHeader("Authorization", auth);
          }
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
            "MaterialGlobalName": { field: "MaterialGlobalName", type: "string", editable: false, parse: function (value) { return value || {}; } },
            "MaterialLocalName": { field: "MaterialLocalName", type: "string", editable: false, parse: function (value) { return value || {}; } }
          }
        }
      },
      batch: false,
      serverPaging: false,
      serverSorting: true,
      serverFiltering: true

    });
  };

  var f_SetFilterUi = function (element, materialClassName) {
    var dataTextField = "MaterialGlobalName";
    var dataSource = f_GetDataSource(materialClassName);

    if (dataSource) {

      if (PCommonPortalMethods.GetSiteLanguage() != "en") {
        dataTextField = "MaterialLocalName";
      }

      element.kendoAutoComplete({
        dataSource: dataSource,
        dataTextField: dataTextField,
        dataValueField: "_MaterialKey",
        minLength: 2
      });
    }
  };

  var f_GetText = function (status, materialClassName) {
    // Falls kein Wert übergeben, dann alle liefern
    if (materialClassName === undefined)
      materialClassName = "";

    // Falls keine Datenquelle für Status gefunden, Nummer liefern
    if (status === undefined)
      return {};

    // Datenquelle ermitteln, falls keine Daten in Datenquelle für Status gefunden, Nummer liefern
    var dataSource = f_GetDataSource(materialClassName);
    if (!dataSource && !dataSource._data)
      return status;

    // Text auslesen und zurückgeben
    for (var i = 0; i < dataSource._data.length; i++) {

      if (parseInt(dataSource._data[i].TextNumber) == parseInt(status)) {
        if (PCommonPortalMethods.GetSiteLanguage() != "en") {
          return kendo.htmlEncode(dataSource._data[i].MaterialLocalName);
        }
        return kendo.htmlEncode(dataSource._data[i].MaterialGlobalName);
      }
    }

    // Falls kein Text gefunden, Nummer liefern
    return status;
  }        

  // -------------------------
  // Initialisiert Datenquelle, notwendig wenn Daten async. geladen werden und bei Verwendung schon verfügbar sein müssen
  var f_Init = function (materialClassName) {
    // Falls kein Wert übergeben, dann alle liefern
    if (materialClassName === undefined)
      materialClassName = "";

    // Datenquelle ermitteln, falls keine Daten in Datenquelle für Status gefunden, Nummer liefern
    return dataSource = f_GetDataSource(materialClassName);
 
  }

  return {
    getDataSource: f_GetDataSource,
    getText: f_GetText,
    setFilterUi: f_SetFilterUi,   
    init: f_Init
  }
}]);


/* ValueCategory  */
modKendoOds.factory("kendoOdsValueCategory", ['kendoHelper', function (kendoHelper) {

    // Struktur: dataSourceElement 
    function c_dataSourceElement(valueCategoryClassName, dataSource) {
        this.valueCategoryClassName = valueCategoryClassName;
        this.dataSource = dataSource;
    };

    var m_dataSourceElements = new Array();  // Array mit allen bereits gelesenen Datenquellen

    // -------------------------
    // Datenquelle des Grids: f_GetDataSourceElement (Hilfsfunktion)
    // ermittelt bereits definierte Datenquellen, wenn diese nicht vorhanden ist wird sie neu angelegt
    var f_GetDataSource = function (valueCategoryClassName) {

        // Falls kein Wert übergeben, dann alle liefern
        if (valueCategoryClassName === undefined)
            valueCategoryClassName = "";

        if (!m_dataSourceElements)
            m_dataSourceElements = new Array();
        // wenn gefunden, entsprechendes Element zurückgeben
        for (var i = 0; i < m_dataSourceElements.length; i++) {
            if (m_dataSourceElements[i].valueCategoryClassName == valueCategoryClassName)
                return m_dataSourceElements[i].dataSource;
        }
        // Element anlegen
        var newElement = new c_dataSourceElement(valueCategoryClassName, f_GetDataSourceElement());

        // Filter/Sortierung setzen
        if (PCommonPortalMethods.GetSiteLanguage() == "en") {
            kendoHelper.setDataSourceFilters(newElement.dataSource, "ValueCategoryGlobalName", "neq", "");
            //kendoHelper.setDataSourceSorts(newElement.dataSource, "ValueCategoryGlobalName", "asc");
        }
        else {
            kendoHelper.setDataSourceFilters(newElement.dataSource, "ValueCategoryLocalName", "neq", "");
            //kendoHelper.setDataSourceSorts(newElement.dataSource, "ValueCategoryLocalName", "asc");
        }

        kendoHelper.setDataSourceSorts(newElement.dataSource, "SortOrder", "asc");

        // Element hinzufügen
        m_dataSourceElements.push(newElement);
        return newElement.dataSource;
    };

    // -------------------------
    // Datenquelle für Status
    var f_GetDataSourceElement = function () {
        return new kendo.data.DataSource({

            type: "odata-v4",
            transport: {
                read: {
                    url: function () {
                        if (PCommonPortalMethods.GetSiteLanguage() == "en") {
                            return $("#gatewayPath").data("value") + "odata/ods/ZSortableValueCategories?$select=_Key,ValueCategoryGlobalName,SortOrder";
                        }
                        else {
                            return $("#gatewayPath").data("value") + "odata/ods/ZSortableValueCategories?$select=_Key,ValueCategoryLocalName,SortOrder";
                        }
                    },

                    datatype: 'json',
                    beforeSend: function (x) {
                        var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
                        x.setRequestHeader("Authorization", auth);
                    }
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
                        "ValueCategoryGlobalName": { field: "ValueCategoryGlobalName", type: "string", editable: false, parse: function (value) { return value || {}; } },
                        "ValueCategoryLocalName": { field: "ValueCategoryLocalName", type: "string", editable: false, parse: function (value) { return value || {}; } }
                    }
                }
            },
            batch: false,
            serverPaging: false,
            serverSorting: true,
            serverFiltering: true

        });
    };

    var f_SetFilterUi = function (element, valueCategoryClassName) {
        var dataTextField = "ValueCategoryGlobalName";
        var dataSource = f_GetDataSource(valueCategoryClassName);

        if (dataSource) {

            if (PCommonPortalMethods.GetSiteLanguage() != "en") {
                dataTextField = "ValueCategoryLocalName";
            }

            element.kendoAutoComplete({
                dataSource: dataSource,
                dataTextField: dataTextField,
                dataValueField: "_ValueCategoryKey",
                minLength: 2
            });
        }
    };

    var f_GetText = function (status, valueCategoryClassName) {
        // Falls kein Wert übergeben, dann alle liefern
        if (valueCategoryClassName === undefined)
            valueCategoryClassName = "";

        // Falls keine Datenquelle für Status gefunden, Nummer liefern
        if (status === undefined)
            return {};

        // Datenquelle ermitteln, falls keine Daten in Datenquelle für Status gefunden, Nummer liefern
        var dataSource = f_GetDataSource(valueCategoryClassName);
        if (!dataSource && !dataSource._data)
            return status;

        // Text auslesen und zurückgeben
        for (var i = 0; i < dataSource._data.length; i++) {

            if (parseInt(dataSource._data[i].TextNumber) == parseInt(status)) {
                if (PCommonPortalMethods.GetSiteLanguage() != "en") {
                    return kendo.htmlEncode(dataSource._data[i].ValueCategoryLocalName);
                }
                return kendo.htmlEncode(dataSource._data[i].ValueCategoryGlobalName);
            }
        }

        // Falls kein Text gefunden, Nummer liefern
        return status;
    }

    // -------------------------
    // Initialisiert Datenquelle, notwendig wenn Daten async. geladen werden und bei Verwendung schon verfügbar sein müssen
    var f_Init = function (valueCategoryClassName) {
        // Falls kein Wert übergeben, dann alle liefern
        if (valueCategoryClassName === undefined)
            valueCategoryClassName = "";

        // Datenquelle ermitteln, falls keine Daten in Datenquelle für Status gefunden, Nummer liefern
        return dataSource = f_GetDataSource(valueCategoryClassName);

    }

    return {
        getDataSource: f_GetDataSource,
        getText: f_GetText,
        setFilterUi: f_SetFilterUi,
        init: f_Init
    }
}]);