using PlantiT.Web.Configuration.Menu;
using PlantiT.Web.Gateway;
using PlantiT.Web.Language;
using PlantiT.Web.Models;
using PlantiT.Web.Models.Database;
using PlantiT.Web.PortalInfo;
using PlantiT.Web.Security;
using System;
using System.Collections.Generic;
using System.Web.Mvc;

namespace PlantiT.Web.HeinekenMassafra
{
    /// <summary>
    /// Erstellt dynamisch Webportal Menüeinträge für EDA Protokoll
    /// </summary>
    public class PHeinekenMassafraMenuProvider : IMenuConfigurationProvider
    {
        /// <summary>
        /// Menu storage
        /// </summary>
        private readonly List<MenuGroup> m_menu;

        /// <summary>
        /// Ods odata connection
        /// </summary>
        // private readonly POdsODataConnection m_menuContext;

        /// <summary>
        /// lock object
        /// </summary>
        private readonly object lockObject = new object();

        /// <summary>
        /// Provider information
        /// </summary>
        public MenuConfigurationProviderInfo ProviderInfo
        {
            get
            {
                return new MenuConfigurationProviderInfo
                {
                    Id = "Menu - ODS", //GetType().ToString(),
                    Name = "Menu - Ods",
                    ShortName = "OdsMenuProvider",
                    Description = "Ods Menu Provider"
                };
            }
        }


        /// <summary>
        /// Return menugroups
        /// </summary>
        /// <returns>Menu groups</returns>
        public IEnumerable<MenuGroup> GetMenu()
        {
            PGatewayConnection gatewayConnection = DependencyResolver.Current.GetService(typeof(PGatewayConnection)) as PGatewayConnection;
            IClientAuthorization authorizationService = DependencyResolver.Current.GetService<IClientAuthorization>();

            // Header über ID ermitteln
            int nLanguageId = ((IPWebPortalInfo)DependencyResolver.Current.GetService<IPWebPortalInfo>()).GetCurrentLanguage().LanguageId();

            lock (lockObject)
            {
                MenuGroup menuGroup = null;

                m_menu.Clear();

                #region MenuGroup: Reports
                menuGroup = new MenuGroup
                {
                    Id = 1,
                    LocalName = PLanguageTexts.TXT_MENUGROUP_REPORTS,
                    GlobalName = PLanguageTexts.TXT_MENUGROUP_REPORTS,
                    Sequence = 1000000,
                    ProviderLink = ProviderInfo.Id
                };
                try
                {
                    menuGroup.Items.Add(
                      new MenuItem
                      {
                          Id = 1000001,
                          MenuGroupId = menuGroup.Id,
                          Area = "PlantiT.Web.HeinekenMassafra.MES",
                          Controller = "Reports",
                          Action = "Index",
                          PlantitRight = "",
                          GlobalName = PLanguageTexts.TXT_MENUGROUPITEM_REPORTOVERVIEW,
                          LocalName = PLanguageTexts.TXT_MENUGROUPITEM_REPORTOVERVIEW,
                          AddInType = AddInType.EmbeddedView,
                      }
                    );
                }
                // ToDo: change errors handling
                catch (Exception)
                {
                    m_menu.Clear();
                    return m_menu;
                }
                m_menu.Add(menuGroup);
                #endregion
                #region MenuGroup: Dashboards
                menuGroup = new MenuGroup
                {
                    Id = 2,
                    LocalName = PLanguageTexts.TXT_MENUGROUP_DASHBOARDS,
                    GlobalName = PLanguageTexts.TXT_MENUGROUP_DASHBOARDS,
                    Sequence = 2000000,
                    ProviderLink = ProviderInfo.Id
                };
                try
                {
                    menuGroup.Items.Add(
                      new MenuItem
                      {
                          Id = 2000001,
                          MenuGroupId = menuGroup.Id,
                          Area = "PlantiT.Web.HeinekenMassafra.MES",
                          Controller = "Dashboards",
                          Action = "Dashboard",
                          PlantitRight = "",
                          GlobalName = PLanguageTexts.TXT_MENUGROUPITEM_PLANTITBATCHANALYTICS,
                          LocalName = PLanguageTexts.TXT_MENUGROUPITEM_PLANTITBATCHANALYTICS,
                          AddInType = AddInType.EmbeddedView,
                      }
                    );
                }
                // ToDo: change errors handling
                catch (Exception)
                {
                    m_menu.Clear();
                    return m_menu;
                }
                m_menu.Add(menuGroup);
                #endregion
                #region MenuGroup: Batch Tracking
                menuGroup = new MenuGroup
                {
                    Id = 3,
                    LocalName = PLanguageTexts.TXT_MENUGROUP_BATCHTRACKING,
                    GlobalName = PLanguageTexts.TXT_MENUGROUP_BATCHTRACKING,
                    Sequence = 3000000,
                    ProviderLink = ProviderInfo.Id
                };
                try
                {
                    menuGroup.Items.Add(
                      new MenuItem
                      {
                          Id = 3000001,
                          MenuGroupId = menuGroup.Id,
                          Area = "PlantiT.Web.HeinekenMassafra.MES",
                          Controller = "BatchTracker",
                          Action = "Batch",
                          PlantitRight = "",
                          GlobalName = PLanguageTexts.TXT_MENUGROUPITEM_BATCHTRACKER,
                          LocalName = PLanguageTexts.TXT_MENUGROUPITEM_BATCHTRACKER,
                          AddInType = AddInType.EmbeddedView,
                      }
                    );
                }
                // ToDo: change errors handling
                catch (Exception)
                {
                    m_menu.Clear();
                    return m_menu;
                }
                m_menu.Add(menuGroup);
                #endregion
                #region MenuGroup: Analysis
                menuGroup = new MenuGroup
                {
                    Id = 4,
                    LocalName = PLanguageTexts.TXT_MENUGROUP_ANALYSIS,
                    GlobalName = PLanguageTexts.TXT_MENUGROUP_ANALYSIS,
                    Sequence = 4000000,
                    ProviderLink = ProviderInfo.Id
                };
                try
                {
                    menuGroup.Items.Add(
                      new MenuItem
                      {
                          Id = 4000001,
                          MenuGroupId = menuGroup.Id,
                          Area = "PlantiT.Web.HeinekenMassafra.MES",
                          Controller = "Batchoverview",
                          Action = "Index",
                          PlantitRight = "",
                          GlobalName = PLanguageTexts.TXT_MENUGROUPITEM_BATCHOVERVIEW,
                          LocalName = PLanguageTexts.TXT_MENUGROUPITEM_BATCHOVERVIEW,
                          AddInType = AddInType.EmbeddedView,
                      }
                    );
                    menuGroup.Items.Add(
                      new MenuItem
                      {
                          Id = 4000002,
                          MenuGroupId = menuGroup.Id,
                          Area = "PlantiT.Web.HeinekenMassafra.MES",
                          Controller = "SAPInterface",
                          Action = "Index",
                          PlantitRight = "",
                          GlobalName = PLanguageTexts.TXT_MENUGROUPITEM_SAPINTERFACE,
                          LocalName = PLanguageTexts.TXT_MENUGROUPITEM_SAPINTERFACE,
                          AddInType = AddInType.EmbeddedView,
                      }
                    );
                    menuGroup.Items.Add(
                     new MenuItem
                     {
                         Id = 4000003,
                         MenuGroupId = menuGroup.Id,
                         Area = "PlantiT.Web.HeinekenMassafra.MES",
                         Controller = "DataExport",
                         Action = "Index",
                         PlantitRight = "",
                         GlobalName = PLanguageTexts.TXT_MENUGROUPITEM_DATAEXPORT,
                         LocalName = PLanguageTexts.TXT_MENUGROUPITEM_DATAEXPORT,
                         AddInType = AddInType.EmbeddedView,
                     }
                   );
                    menuGroup.Items.Add(
                     new MenuItem
                     {
                         Id = 4000004,
                         MenuGroupId = menuGroup.Id,
                         Area = "PlantiT.Web.HeinekenMassafra.MES",
                         Controller = "DosingBatchManagement",
                         Action = "Index",
                         PlantitRight = "",
                         GlobalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_DOSINGBATCHES,
                         LocalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_DOSINGBATCHES,
                         AddInType = AddInType.EmbeddedView,
                     }
                   );
                    menuGroup.Items.Add(
                     new MenuItem
                     {
                         Id = 4000004,
                         MenuGroupId = menuGroup.Id,
                         Area = "PlantiT.Web.HeinekenMassafra.MES",
                         Controller = "EventHistory",
                         Action = "Index",
                         PlantitRight = "",
                         GlobalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_EVENTHISTORY,
                         LocalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_EVENTHISTORY,
                         AddInType = AddInType.EmbeddedView,
                     }
                   );
                    menuGroup.Items.Add(
                     new MenuItem
                     {
                         Id = 4000005,
                         MenuGroupId = menuGroup.Id,
                         Area = "PlantiT.Web.HeinekenMassafra.MES",
                         Controller = "ExceptionReport",
                         Action = "Index",
                         PlantitRight = "",
                         GlobalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_EXCEPTIONREPORT,
                         LocalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_EXCEPTIONREPORT,
                         AddInType = AddInType.EmbeddedView,
                     }
                   );
                    menuGroup.Items.Add(
                     new MenuItem
                     {
                         Id = 4000006,
                         MenuGroupId = menuGroup.Id,
                         Area = "PlantiT.Web.HeinekenMassafra.MES",
                         Controller = "TestConformance",
                         Action = "Index",
                         PlantitRight = "",
                         GlobalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_TESTCONFORMANCE,
                         LocalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_TESTCONFORMANCE,
                         AddInType = AddInType.EmbeddedView,
                     }
                   );
                    menuGroup.Items.Add(
                     new MenuItem
                     {
                         Id = 4000007,
                         MenuGroupId = menuGroup.Id,
                         Area = "PlantiT.Web.HeinekenMassafra.MES",
                         Controller = "VariableConformance",
                         Action = "Index",
                         PlantitRight = "",
                         GlobalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_VARIABLECOMFORMANCE,
                         LocalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_VARIABLECOMFORMANCE,
                         AddInType = AddInType.EmbeddedView,
                     }
                   );
                    menuGroup.Items.Add(
                    new MenuItem
                    {
                        Id = 4000008,
                        MenuGroupId = menuGroup.Id,
                        Area = "PlantiT.Web.HeinekenMassafra.MES",
                        Controller = "OPICalculation",
                        Action = "Index",
                        PlantitRight = "",
                        GlobalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_OPICALCULATION,
                        LocalName = PLanguageTexts.DEFAULT_TXT_MENUGROUPITEM_OPICALCULATION,
                        AddInType = AddInType.EmbeddedView,
                    }
                  );
                }
                // ToDo: change errors handling
                catch (Exception)
                {
                    m_menu.Clear();
                    return m_menu;
                }
                m_menu.Add(menuGroup);
                #endregion
                #region MenuGroup: Templates
                menuGroup = new MenuGroup
                {
                    Id = 5,
                    LocalName = PLanguageTexts.TXT_MENUGROUP_TEMPLATES,
                    GlobalName = PLanguageTexts.TXT_MENUGROUP_TEMPLATES,
                    Sequence = 5000000,
                    ProviderLink = ProviderInfo.Id
                };
                try
                {
                    menuGroup.Items.Add(
                      new MenuItem
                      {
                          Id = 5000001,
                          MenuGroupId = menuGroup.Id,
                          Area = "PlantiT.Web.HeinekenMassafra.MES",
                          Controller = "MaintainTemplate",
                          Action = "IndexDE",
                          PlantitRight = "",
                          GlobalName = PLanguageTexts.TXT_MENUGROUPITEM_EXCELREPORTTEMPLATE,
                          LocalName = PLanguageTexts.TXT_MENUGROUPITEM_EXCELREPORTTEMPLATE,
                          AddInType = AddInType.EmbeddedView,
                      }
                    );
                    menuGroup.Items.Add(
                     new MenuItem
                     {
                         Id = 5000002,
                         MenuGroupId = menuGroup.Id,
                         Area = "PlantiT.Web.HeinekenMassafra.MES",
                         Controller = "MaintainTemplate",
                         Action = "IndexEH",
                         PlantitRight = "",
                         GlobalName = PLanguageTexts.TXT_MENUGROUPITEM_EVENTHISTORYTEMPLATE,
                         LocalName = PLanguageTexts.TXT_MENUGROUPITEM_EVENTHISTORYTEMPLATE,
                         AddInType = AddInType.EmbeddedView,
                     }
                   );
                }
                // ToDo: change errors handling
                catch (Exception)
                {
                    m_menu.Clear();
                    return m_menu;
                }
                m_menu.Add(menuGroup);
                #endregion
                #region MenuGroup: Administration
                menuGroup = new MenuGroup
                {
                    Id = 6,
                    LocalName = PLanguageTexts.TXT_MENUGROUP_ADMINISTRATION,
                    GlobalName = PLanguageTexts.TXT_MENUGROUP_ADMINISTRATION,
                    Sequence = 6000000,
                    ProviderLink = ProviderInfo.Id
                };
                try
                {
                    menuGroup.Items.Add(
                      new MenuItem
                      {
                          Id = 6000001,
                          MenuGroupId = menuGroup.Id,
                          Area = "PlantiT.Web.HeinekenMassafra.MES",
                          Controller = "Dashboards",
                          Action = "Dashboard",
                          PlantitRight = "",
                          GlobalName = PLanguageTexts.TXT_MENUGROUPITEM_WEBPORTAL,
                          LocalName = PLanguageTexts.TXT_MENUGROUPITEM_WEBPORTAL,
                          AddInType = AddInType.EmbeddedView,
                      }
                    );
                }
                // ToDo: change errors handling
                catch (Exception)
                {
                    m_menu.Clear();
                    return m_menu;
                }
                m_menu.Add(menuGroup);
                #endregion
            }
            return m_menu;
        }

    /// <summary>
    /// Save manu
    /// </summary>
    /// <param name="menuGroups">Groups with items</param>
    public void SaveMenu(IEnumerable<MenuGroup> menuGroups)
    {
        // not implemented
    }

    /// <summary>
    /// Constructor
    /// </summary>
    public PHeinekenMassafraMenuProvider(PGatewaySettings gatewaySettings)
    {
        if (gatewaySettings == null)
        {
            throw new NullReferenceException("EDAProtocolOperationProvider constructor");
        }

        lockObject = new object();

        m_menu = new List<MenuGroup>();
    }
}
}