using PlantiT.Web;
using System;
using System.Collections.Generic;
using System.Web.Mvc;
using System.Web.Optimization;
using PlantiT.Web.HeinekenMassafra.MES.Controllers;
using PlantiT.Web.Configuration.Menu;
using PlantiT.Web.Gateway;

namespace PlantiT.Web.HeinekenMassafra
{
    public class PHeinekenMassafraMES : AreaRegistration
    {
        /// <summary>
        /// Die Area.
        /// </summary>
        public override string AreaName
        {
            get
            {
                return "PlantiT.Web.HeinekenMassafra.MES";
            }
        }

        /// <summary>
        /// Registriert die Area.
        /// </summary>
        /// <param name="context">Der Registrierungskontext.</param>
        public override void RegisterArea(AreaRegistrationContext context)
        {

            context.MapRoute(
              "PlantiT.Web.HeinekenMassafra.MES_default",
              "PlantiT.Web.HeinekenMassafra.MES/{controller}/{action}/{id}",
              new { action = "Index", id = UrlParameter.Optional },
              new[] { "PlantiT.Web.HeinekenMassafra.MES.Controllers" }
            );



            // ------------ Styles ------------
            // Angular
            BundleTable.Bundles.Add(new StyleBundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/angular/angularBundle").Include(
               new string[]{
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/angular/ngDialog.min.css",
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/angular/ngDialog-theme-default.min.css",
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/angular/ngDialog-theme-plain.min.css"
                }
              ));

            // Kendo
            BundleTable.Bundles.Add(new StyleBundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/kendo/kendoBundle").Include(
               new string[]{
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/kendo/kendo.common.min.css",
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/kendo/kendo.rtl.min.css",
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/kendo/kendo.default.min.css",
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/kendo/kendo.dataviz.min.css",
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/kendo/kendo.dataviz.default.min.css"
                }
              ));

            // Eigene Styles
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/DataExportBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/DataExport.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/BatchOverviewBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/BatchOverview.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/SAPInterfaceBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/SAPInterface.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/TestFrontEndBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/TestFrontEnd.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/MaintainTemplateBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/MaintainTemplate.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/FTRBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/FTR.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/DrillInBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/DrillIn.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/MaintainFTRTemplateBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/MaintainFTRTemplate.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/MaintainDrillInTemplateBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/MaintainDrillInTemplate.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/DosingBatchManagementBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/DosingBatchManagement.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/EventHistoryBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/EventHistory.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/ExceptionReportBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/ExceptionReport.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/VariableConformanceBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/VariableConformance.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/TestConformanceBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/TestConformance.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/OPICalculationBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/OPICalculation.css"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/GradoFSTBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Styles/GradoFST.css"));
            // ------------ Scripts ------------
            // jQuery
            BundleTable.Bundles.Add(new ScriptBundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/jQuery/jQueryBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/jQuery/jquery-2.1.1.js"));

            // jQuery-ui
            {
                List<string> pathToJS = new List<string>();
                pathToJS.Add("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/jQuery-ui/jquery-ui-1.11.1.js");

                if (System.Threading.Thread.CurrentThread.CurrentCulture.TwoLetterISOLanguageName != "en")
                    pathToJS.Add(string.Format("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/jQuery-ui/Localization/jquery.ui.datepicker-{0}.js", System.Threading.Thread.CurrentThread.CurrentCulture.TwoLetterISOLanguageName));

                BundleTable.Bundles.Add(new ScriptBundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/jQuery-ui/jQuery-uiBundle").Include(pathToJS.ToArray()));
            }

            // Angular                                                                                                                
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/angular/angularBundle").Include(
               new string[]{
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/angular/angular.min.js",
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/angular/angular-sanitize.js",
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/angular/ngDialog.min.js"
                }
              ));

            // he
            BundleTable.Bundles.Add(new ScriptBundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/he/heBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/he/he-{version}.js"));

            // jszip
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/jszip/jszipBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/jszip/jszip.js"));

            // Kendo
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/kendo/kendoBundle")
                .Include(new string[] { "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/kendo/kendo.all.min.js", "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/kendo/cultures/kendo.culture.it.min.js", "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/kendo/kendo.angular.min.js", }));


            // Eigene Skripte
            // Angular                                                                                                                
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/HelperBundle").Include(
               new string[]{
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/_helper/kendoHelper.js",
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/_helper/kendoOds.js",
            "~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/_helper/refresh.js"
                }
              ));

            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/DataExportBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/DataExport.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/BatchOverviewBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/BatchOverview.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/SAPInterfaceBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/SAPInterface.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/TestFrontEndBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/TestFrontEnd.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/MaintainTemplateBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/MaintainTemplate.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/FTRBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/FTR.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/DrillInBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/DrillIn.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/MaintainFTRTemplateBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/MaintainFTRTemplate.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/MaintainDrillInTemplateBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/MaintainDrillInTemplate.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/DosingBatchManagementBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/DosingBatchManagement.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/EventHistoryBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/EventHistory.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/ExceptionReportBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/ExceptionReport.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/VariableConformanceBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/VariableConformance.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/TestConformanceBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/TestConformance.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/OPICalculationBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/OPICalculation.js"));
            BundleTable.Bundles.Add(new Bundle("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/GradoFSTBundle").Include("~/Areas/PlantiT.Web.HeinekenMassafra.MES/Content/Scripts/GradoFST.js"));
            // Register Services
            //if (context.State is PAreaRegistrationState)
            //{
            //   Die Lieferanten der Datenbankdaten
            //  ((PAreaRegistrationState)context.State).RegisterType<IMyService, MyServiceImplementation>();
            //}
            if (context.State is PAreaRegistrationState)
            {
                // get main menu provider
                IMenuProvider menuProvider = DependencyResolver.Current.GetService<IMenuProvider>();

                // register menu config ODS provider
                PGatewaySettings gatewaySettings = DependencyResolver.Current.GetService<PGatewaySettings>();
                PHeinekenMassafraMenuProvider configProvider = new PHeinekenMassafraMenuProvider(gatewaySettings);// todo, new POdsODataConnection(gatewaySettings));
                menuProvider.Register(configProvider);
                ((PAreaRegistrationState)context.State).RegisterInstance(configProvider);
            }
        }

    }
}
