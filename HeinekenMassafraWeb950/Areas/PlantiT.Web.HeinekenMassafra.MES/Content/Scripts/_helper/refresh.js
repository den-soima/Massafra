/* Refreshhandling */
angular.module('app.refresh', [])
  .factory("refresh", ['$interval', function ($interval) {
    // Konstanten                               
    const AUTOMATICREFRESH_INTERVAL_MS = 120 * 1000;
    const AUTOMATICREFRESHDELAY_INTERVAL_MS = 300 * 1000;

    var m_intervalAutomaticRefresh;
    var m_intervalAutomaticRefreshDelay;

    // Refreshhandling - AutomaticRefresh
    var f_StartAutomaticRefresh = function (callBackFunc) {
      // console.log("f_StartAutomaticRefresh");
      if (m_intervalAutomaticRefresh || m_intervalAutomaticRefreshDelay)             // wenn delay läuft dann nicht starten
        return;

      m_intervalAutomaticRefresh = $interval(function () { callBackFunc(); }, AUTOMATICREFRESH_INTERVAL_MS);
    };

    var f_StopAutomaticRefresh = function () {
      // console.log("f_StopAutomaticRefresh");
      if (!m_intervalAutomaticRefresh)
        return;

      $interval.cancel(m_intervalAutomaticRefresh);
      m_intervalAutomaticRefresh = undefined;
    };

    // Refreshhandling - AutomaticRefreshDelay
    var f_StartAutomaticRefreshDelay = function (callBackFunc) {
      // console.log("f_StartAutomaticRefreshDelay");
      if (m_intervalAutomaticRefresh || m_intervalAutomaticRefreshDelay)            
        return;

      m_intervalAutomaticRefreshDelay = $interval(function () { callBackFunc(); }, AUTOMATICREFRESHDELAY_INTERVAL_MS);
    };

    var f_StopAutomaticRefreshDelay = function () {
      // console.log("f_StopAutomaticRefreshDelay");
      if (!m_intervalAutomaticRefreshDelay)
        return;

      $interval.cancel(m_intervalAutomaticRefreshDelay);
      m_intervalAutomaticRefreshDelay = undefined;
    };

    var f_TriggerAutomaticRefreshDelay = function (callBackFunc) {
      f_StopAutomaticRefreshDelay();
      f_StartAutomaticRefreshDelay(callBackFunc);
    };

    return {
      // Refreshhandling - AutomaticRefresh
      StartAutomaticRefresh: f_StartAutomaticRefresh,
      StopAutomaticRefresh: f_StopAutomaticRefresh,

      // Refreshhandling - AutomaticRefreshDelay
      StartAutomaticRefreshDelay: f_StartAutomaticRefreshDelay, 
      StopAutomaticRefreshDelay: f_StopAutomaticRefreshDelay,   
      TriggerAutomaticRefreshDelay: f_TriggerAutomaticRefreshDelay
    }
  }]);
