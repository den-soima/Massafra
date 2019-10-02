// App: KendoVariableConformance
var app = angular.module("KendoOPICalculation", ["kendo.directives", "ngDialog", "app.kendoHelper", "app.kendoOds", "app.refresh"])

// Controller: VariableConformanceCtrl
app.controller("OPICalculationCtrl", ['$scope', '$interval', '$document', 'ngDialog', 'txt', 'kendoHelper', 'refresh', 
function ($scope, $interval, $document, ngDialog, txt, kendoHelper, refresh) {


// Konstanten                                                        
  const TIMEINTERVAL_PER_DAY_MS = 86400000;

  const TIMEOUT_DELAY_DATABOUND = 500;  // notwendig um doppeltes Aufrufen zu vermeiden

  var m_dataSourceValuesInitialized = false;
  var m_dataFilterValuesInitialized = false;

  $scope.SyncDS = false;
  $scope.doRebind = false;
  $scope.GotoActive = false;

    /** 
   * Get the ISO week date week number 
   */
    Date.prototype.getWeek = function () {
      // Create a copy of this date object  
      var target = new Date(this.valueOf());

      // ISO week date weeks start on monday  
      // so correct the day number  
      var dayNr = (this.getDay() + 6) % 7;

      // ISO 8601 states that week 1 is the week  
      // with the first thursday of that year.  
      // Set the target date to the thursday in the target week  
      target.setDate(target.getDate() - dayNr + 3);

      // Store the millisecond value of the target date  
      var firstThursday = target.valueOf();

      // Set the target to the first thursday of the year  
      // First set the target to january first  
      target.setMonth(0, 1);
      // Not a thursday? Correct the date to the next thursday  
      if (target.getDay() != 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
      }

      // The weeknumber is the number of weeks between the   
      // first thursday of the year and the thursday in the target week  
      return 1 + Math.ceil((firstThursday - target) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000  
    }

    /** 
    * Get the ISO week date year number 
    */
    Date.prototype.getWeekYear = function () {
      // Create a new date object for the thursday of this week  
      var target = new Date(this.valueOf());
      target.setDate(target.getDate() - ((this.getDay() + 6) % 7) + 3);

      return target.getFullYear();
    }


    $scope.GetWeekMonday = function (year, week)
    {
      //Ersten januar des jahres finden und merken
      var FirstJan = new Date(year, 0, 1);

      //Ersten Donnerstag ableiten
      var FirstThur = FirstJan;
      if (FirstThur.getDay() != 4) {
        FirstThur.setMonth(0, 1 + ((4 - FirstThur.getDay()) + 7) % 7);
      }

      var target = ((week - 1) * 604800000) + FirstThur.valueOf();

      var WeekThursday = new Date(target);

      return new Date(WeekThursday.setDate(WeekThursday.getDate() - ((WeekThursday.getDay() + 6) % 7)));

    }


  // DataSource für Werte
  var m_dataSourceValues = new kendo.data.DataSource({
    type: "odata-v4",
    sort: {
      field: "Week",
      dir: "asc"
    },
   
    transport: {
      read: {
        url: $("#gatewayPath").data("value") + "odata/ods/ZOPICalculations",
        datatype: 'json',
        beforeSend: function (x) {
          var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
          x.setRequestHeader("Authorization", auth);
        },
        cache: false,
        
      },
      update: {
        url: function (data) {
          return $("#gatewayPath").data("value") + "odata/ods/ZOPICalculations(" + data._Key + ")";
        },
        dataType: "json",
        type: "PATCH",
        beforeSend: function (x) {
          var auth = $("#authenticationType").data("value") + " " + $("#authenticationToken").data("value");
          x.setRequestHeader("Authorization", auth);
        }
      },
      parameterMap: function (data, operation) {
        if (operation === "update") {


            data._Kendo_SaveIt = 0;
            var test = '{  "_Key": "' + data._Key +                
              '", "WorkingDays": "' + (data.WorkingDays ? data.WorkingDays:0  )+
              '", "PlannedBrews": "' + (data.PlannedBrews ? data.PlannedBrews : 0 )+
              '", "PlannedDown": "' + (data.PlannedDown ? data.PlannedDown : 0) +
              '", "Nona": "' + (data.Nona ? data.Nona : 0 )+
              '", "ExtLack": "' + (data.ExtLack ? data.ExtLack : 0) +
                '", "ExtStrike": "' + (data.ExtStrike ? data.ExtStrike : 0) +
              '", "NotPlannedStop": "' + (data.NotPlannedStop ? data.NotPlannedStop : 0) +
              '", "NotPlannedStopMan": "' + (data.NotPlannedStopMan ? data.NotPlannedStopMan : 0) +
              '", "CalculationDone": "' + 0 +
                '"}';
            return test;
         

        }      
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
      if (!m_dataFilterValuesInitialized || !m_dataSourceValuesInitialized) {
        e.preventDefault();

        // Datenquelle wurde initialisiert
        m_dataSourceValuesInitialized = true;

      }
    },
    sync: function (e) {
      var test = 1;
    },
    schema: {
      model: {
          id: "_Key",
          fields: {
            "_Key": {editable: false, type: "number" },
            "Year": { editable: false, type: "number" },
            "Week": { editable: false, type: "number" },

            "WorkingDays": { type: "number" },
            "PlannedBrews": { type: "number" },
            "PlannedDown": { type: "number" },
            "Nona": { type: "number" },
            "ExtLack": { type: "number" },
            "ExtStrike": { type: "number" },
            "NotPlannedStop": { type: "number" },
            "NotPlannedStopMan": { type: "number" },

            "MannedTime": { editable: false, type: "number" },
            "ProdTime": { editable: false, type: "number" },
            "ExtStop": { editable: false, type: "number" },
            "AvailableTime": { editable: false, type: "number" },
            "BrewsActual": { editable: false, type: "number" },
            "BrewsNominal": { editable: false, type: "number" },
            "OPIMaxTheoWk": { editable: false, type: "number" },
            "OPIMaxTheoMon": { editable: false, type: "number" },
            "WeekEfficiency": { editable: false, type: "number" },
            "MonthEfficiency": { editable: false, type: "number" },
            "WeekEfficacy": { editable: false, type: "number" },
            "MonthEfficacy": { editable: false, type: "number" },
            "WeekOpi": { editable: false, type: "number" },
            "MonthOpi": { editable: false, type: "number" },
            "ProgressiveEfficiency": { editable: false, type: "number" },
            "ProgressiveEfficacy": { editable: false, type: "number" },
            "ProgressiveOpi": { editable: false, type: "number" },
            "NotPlannedStopAuto": { editable: false, type: "number" },
            "Target": { editable: false, type: "number" },
            "StartDate": { editable: false, type: "date" },
            "CalculationDone": { editable: false, type: "number" },
            "_Kendo_SaveIt": { type: "number", defaultValue: 0, parse: function (value) { return 0; } }
          }
       
      }
    },
    batch: false,
    serverPaging: true,
    serverSorting: true,
    serverFiltering: true,
   
  });

  
  


  $document.ready(function () {


  });

  $scope.OnLoadValues = function () {
      
   

  };

  // ----------------------------------------
  // Defaultwerte für Filtereinstellungen

 

 
 

  // ----------------------------------------
  // Optionen für dateTimePickerStart
  $scope.datePickerOPICalculation = {
    change: function () {
      $scope.OnFilterChanged();
    },
    start: "decade",                          
    depth: "decade",                           
    format: "yyyy"
  };



  

  $scope.OnFilterChanged = function () {
    // Sperren
    m_dataFilterValuesInitialized = false;
 
    kendoHelper.setDataSourceFilters(m_dataSourceValues, "Year", "eq", $scope.datePickerOPICalculation.value().getFullYear());
    
    m_dataFilterValuesInitialized = true;

    m_dataSourceValues.read();

    $scope.gridOPICalculations.dataSource.pageSize(14);
   
  }

  // Optionen für Grid TestConformances
  $scope.gridOPICalculations = {
    // toolbar: ["pdf", "excel"],       // disabled due to bug in kendo ui 2015 

    dataSource: m_dataSourceValues,

    editable: true,
    save: function (e) {
      if (e.values != undefined) {



        // soll etwas gespeichert werden?
        e.model._Kendo_SaveIt = 1;
      }
    },


   

    // columnMenu: true,
    columns: [
          { command: ["edit"], title: "&nbsp;", width: "75px" },
      {
        field: "Year",
        title: txt.TXT_YEAR,
        width: "60px",
      },
      {
        field: "Week",
        title: txt.TXT_WEEK,
        width: "65px",
        attributes: { class: "text-center" },
        template: '#= kendo.toString(Week, "n0")#'

      },
      {
        field: "WorkingDays",
        title: txt.TXT_WORKINGDAYS,
        width: "85px",
        attributes: { class: "text-center" },
        template: '#= WorkingDays ? kendo.toString(WorkingDays, "n0") : "" #'
      },
     
      {
        field: "PlannedBrews",
        title: txt.TXT_PLANNEDBREWS,
        width: "85px",
        attributes: { class: "text-center" },
        template: '#= PlannedBrews ? kendo.toString(PlannedBrews, "n0") : ""#'
      },
      {
        field: "PlannedDown",
        title: txt.TXT_PLANNEDDOWN,
        width: "85px",
        attributes: { class: "text-center" },
        template: '#= PlannedDown ? kendo.toString(PlannedDown, "n2"):""#'
      },
       {
      field: "Nona",
      title: txt.TXT_NONA,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=Nona? kendo.toString(Nona, "n2"):""#'
      },
       {
      field: "ExtLack",
      title: txt.TXT_EXT_LACK,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=ExtLack? kendo.toString(ExtLack, "n2"):""#'
      },
       {
      field: "ExtStrike",
      title: txt.TXT_EXT_STRIKE,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=ExtStrike? kendo.toString(ExtStrike, "n2"):""#'
      },
       {
      field: "NotPlannedStop",
      title: txt.TXT_NPS,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#= NotPlannedStop? kendo.toString(NotPlannedStop, "n2"):""#'
      },
       {
      field: "NotPlannedStopMan",
      title: txt.TXT_NPS_M,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=NotPlannedStopMan? kendo.toString(NotPlannedStopMan, "n2"):""#'
      },
       {
      field: "MannedTime",
      title: txt.TXT_MANNEDTIME,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=MannedTime? kendo.toString(MannedTime, "n2"):""#'
      },
       {
      field: "ProdTime",
      title: txt.TXT_PRODTIME,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=ProdTime? kendo.toString(ProdTime, "n2"):""#'
      },
       {
      field: "ExtStop",
      title: txt.TXT_EXTSTOP,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=ExtStop? kendo.toString(ExtStop, "n2"):""#'
      },
       {
      field: "AvailableTime",
      title: txt.TXT_AVAILABLETIME,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=AvailableTime? kendo.toString(AvailableTime, "n2"):""#'
      },
       {
      field: "BrewsActual",
      title: txt.TXT_BREWS_ACTUAL,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=BrewsActual? kendo.toString(BrewsActual, "n0"):""#'
      },
       {
      field: "BrewsNominal",
      title: txt.TXT_BREWS_NOMINAL,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=BrewsNominal? kendo.toString(BrewsNominal, "n0"):""#'
      },
       {
      field: "OPIMaxTheoWk",
      title: txt.TXT_OPI_MAX_T_WK,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=OPIMaxTheoWk? kendo.toString(OPIMaxTheoWk, "n2"):""#'
      },
       {
      field: "OPIMaxTheoMon",
      title: txt.TXT_OPI_MAX_T_MON,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=OPIMaxTheoMon? kendo.toString(OPIMaxTheoMon, "n2"):""#'
      },
       {
      field: "WeekEfficiency",
      title: txt.TXT_EFFICIENCY_WK,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=WeekEfficiency? kendo.toString(WeekEfficiency, "n2"):""#'
      },
       {
      field: "MonthEfficiency",
      title: txt.TXT_EFFICIENCY_MON,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=MonthEfficiency? kendo.toString(MonthEfficiency, "n2"):""#'
      },
       {
      field: "WeekEfficacy",
      title: txt.TXT_EFFICACY_WK,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=WeekEfficacy? kendo.toString(WeekEfficacy, "n2"):""#'
      },
       {
      field: "MonthEfficacy",
      title: txt.TXT_EFFICACY_MON,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=MonthEfficacy? kendo.toString(MonthEfficacy, "n2"):""#'
      },
       {
      field: "WeekOpi",
      title: txt.TXT_OPI_WK,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=WeekOpi? kendo.toString(WeekOpi, "n2"):""#'
      },
       {
      field: "MonthOpi",
      title: txt.TXT_OPI_MON,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=MonthOpi? kendo.toString(MonthOpi, "n2"):""#'
      },
       {
      field: "ProgressiveEfficiency",
      title: txt.TXT_EFFICIENCY_PROG,
      width: "85px",
      attributes: { class: "text-center" },
      template: '#=ProgressiveEfficiency? kendo.toString(ProgressiveEfficiency, "n2"):""#'
      },
      {
        field: "ProgressiveEfficacy",
        title: txt.TXT_EFFICACY_PROG,
        width: "85px",
        attributes: { class: "text-center" },
        template: '#=ProgressiveEfficacy? kendo.toString(ProgressiveEfficacy, "n2"):""#'
      },
      {
        field: "ProgressiveOpi",
        title: txt.TXT_OPI_PROG,
        width: "85px",
        attributes: { class: "text-center" },
        template: '#=ProgressiveOpi? kendo.toString(ProgressiveOpi, "n2"):""#'
      },
      {
        field: "NotPlannedStopAuto",
        title: txt.TXT_NPS_A,
        width: "85px",
        attributes: { class: "text-center" },
        template: '#=NotPlannedStopAuto? kendo.toString(NotPlannedStopAuto, "n2"):""#'
      },


    ],

    editable: {
      mode: "popup",
      template: kendo.template($("#popup-editor").html())
    },
    dataBound: function (data) {

      if ($scope.GotoActive && $scope.datePickerOPICalculation.value()) 
      {

        $scope.GotoActive = false;

        //Gleiches Jahr
        if ((new Date()).getFullYear() == $scope.datePickerOPICalculation.value().getFullYear()) {

          var dateOffset = (24 * 60 * 60 * 1000) * 7; //7 days
          var myDate = new Date();
          myDate.setTime(myDate.getTime() - dateOffset);


          $scope.gridOPICalculations.pager.page(Math.ceil(myDate.getWeek() / $scope.gridOPICalculations.pager.pageSize()));

        }
      }
    },
    pageable: {
      pageSize: 14,
      pageSizes: true,
      buttonCount: 5,
      refresh: true
    },
   
   
  };
 

  // Refresh/Cancel
  $scope.OnGridOPICalculationsRefresh = function () {

    $scope.OnFilterChanged();
  };

  //Page setzen
  $scope.OnGridOPICalculationsGoto = function () {

    if (!$scope.dOPICalculation) {
      $scope.datePickerOPICalculation.value(new Date());
      $scope.GotoActive = true;
      $scope.OnFilterChanged();
    }
    else {
      //Gleiches Jahr
      if ((new Date()).getFullYear() == $scope.dOPICalculation.getFullYear()) {

        var dateOffset = (24 * 60 * 60 * 1000) * 7; //7 days
        var myDate = new Date();
        myDate.setTime(myDate.getTime() - dateOffset);


        $scope.gridOPICalculations.pager.page(Math.ceil(myDate.getWeek() / $scope.gridOPICalculations.pager.pageSize()));

      }
    }


   

    
  };


}






]);