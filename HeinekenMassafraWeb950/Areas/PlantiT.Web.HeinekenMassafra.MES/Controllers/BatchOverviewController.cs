using PlantiT.Web.Security;
using System;
using System.Collections.Generic;
using System.Linq;        
using System.Web.Mvc;                                    
using PlantiT.Web.Gateway;
using System.Net;
using PlantiT.Web.HeinekenMassafra.Areas.PlantiT.Web.HeinekenMassafra.MES.Models;
using System.Web;
using System.IO;
using System.Reflection;
using Microsoft.SqlServer.Dts.Runtime;
using PlantiT.Web.HeinekenMassafra.Areas.PlantiT.Web.HeinekenMassafra.MES.Logger;


namespace PlantiT.Web.HeinekenMassafra.MES.Controllers
{
  public class
      BatchOverviewController : Controller
    {
    class MyEventListener : DefaultEvents
    {
      public override bool OnError(DtsObject source, int errorCode, string subComponent,
          string description, string helpFile, int helpContext, string idofInterfaceWithError)
      {
        // Todo
        //Logger log = new Logger("C:\\LOG\\log2.txt");
        //log.Log("Ex in Package",String.Format("Error in {0}/{1} : {2}", source, subComponent, description));
        return base.OnError(source, errorCode, subComponent, description, helpFile, helpContext, idofInterfaceWithError);
      }
    } 

        // GET: PlantiT.Web.HeinekenMassafra.MES/BatchOverviewController
      public ActionResult Index()
      {
        // Berechtigungen ermitteln
        PPrincipal principal = System.Web.HttpContext.Current.GetPrincipal();
        if ((null != principal) && !String.IsNullOrWhiteSpace(principal.AuthenticationType))
        {
          ViewBag.AuthenticationToken = principal.AuthenticationToken;
          ViewBag.AuthenticationType = principal.AuthenticationType; 
        }

        // Gateway Verbindung
        PGatewayConnection gatewayConnection = DependencyResolver.Current.GetService(typeof(PGatewayConnection)) as PGatewayConnection;
  
        if (gatewayConnection == null)
        {
          return new HttpStatusCodeResult(HttpStatusCode.Conflict, "Gateway information not found");
        }

        ViewBag.GatewayPath = gatewayConnection.BaseUri;

        return View();
      }
      /// <summary>
      /// Erstellt Excel Bericht
      /// </summary>
      /// <returns></returns>
      [HttpGet]
      public ActionResult CreateBrewReport(String _BatchKey, bool CreateLogFile = true)
      {
        //CBE: Aufgrund von Problemen als Job in die Datenbak verlegt

        //// Parameterhandling      
        //const string FILENAME_TYPE = "xlsx";
        //const string EXCEL_TEMPLATE_NAME = "ExcelReport_BatchBrew_Template" + "." + FILENAME_TYPE;
        //const string SSIS_PACKAGE = "ExcelReport_BatchBrew.dtsx";
        //const string FOLDER_BASE_SOURCE = "Areas\\PlantiT.Web.HeinekenMassafra.MES\\Excel";
        //const string FOLDER_BIN = "bin";
        //const string FOLDER_TEMPLATE = "template";
        //const string FOLDER_BASE_OUTPUT = "D:\\Heineken-ImportExport\\Rapportino";
        //const string LOG_FILE_NAME = "DownloadBrewBatch_Log.txt";

        //String sLocation = Assembly.GetExecutingAssembly().Location;  // Get current directory                        

        //Logger logger = null;

        //long nBatchKey = 0;
        //string sBatchName = String.Empty;
        //string sBatchNumber = String.Empty;
        //string sSAPMaterial     = String.Empty;
        //string sSAP_Batch       = String.Empty;
        //string sBrewLine        = String.Empty;
        //string sShortMaterial   = String.Empty;

        //string FILENAME_PREFIX = DateTime.Now.ToString("yy");

        //string sSourcePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, FOLDER_BASE_SOURCE);
        //string sDestinationPath =  FOLDER_BASE_OUTPUT;
        //string sDestinationFilePath = String.Empty;
        //string sFileName = String.Empty;

        //DateTime dtCheckTime = DateTime.Now;

        //List<CBatch> listBatch = null;

        //// Log generieren
        //if (CreateLogFile)
        //  logger = new Logger(Path.Combine(sDestinationPath, LOG_FILE_NAME), true);


        //// Batch Key ermitteln
        //try
        //{
        //  nBatchKey = Convert.ToInt64(_BatchKey);
        //}
        //catch
        //{
        //  return new HttpNotFoundResult(String.Format("Invalid BatchKey: {0}", _BatchKey));
        //}

        //// Batchdaten ermitteln
        //String odataURI = String.Format("odata/ods/ZWebSAPInterfaceStatuses?$select=_BatchKey,BatchName,SAPMaterial,SAP_Batch&$filter=_BatchKey eq {0}", _BatchKey);

        //PGatewayConnection gatewayConnection = DependencyResolver.Current.GetService(typeof(PGatewayConnection)) as PGatewayConnection;
        //try
        //{
        //  listBatch = gatewayConnection.ReadItem<CODataResponse<CBatch>>(odataURI).Value;
        //}
        //catch
        //{
        //  return new HttpNotFoundResult(String.Format("OData query invalid for BatchKey: {0}", _BatchKey));
        //}

        //// Daten prüfen
        //if (listBatch == null || listBatch.Where(x => x._BatchKey == nBatchKey).Count() == 0)
        //{
        //  return new HttpNotFoundResult(String.Format("Data not found for BatchKey: {0}", _BatchKey));
        //}

        //// Namen von Auftrag ermitteln
        //sBatchName = listBatch.Where(x => x._BatchKey == nBatchKey).FirstOrDefault().BatchName;
        //sBatchNumber    = sBatchName.Substring(0, 12).Substring(sBatchName.Substring(0, 12).Length - 4, 4);
        //sSAPMaterial = listBatch.Where(x => x._BatchKey == nBatchKey).FirstOrDefault().SAPMaterial;
        //sSAP_Batch = listBatch.Where(x => x._BatchKey == nBatchKey).FirstOrDefault().SAP_Batch;
        //sBrewLine       = sSAP_Batch.Substring(5, 1);
        //sShortMaterial  = sSAPMaterial.Substring(sSAPMaterial.Length - 5);

        //// BatchName prüfen
        //if (sBatchName.Equals(String.Empty))
        //{
        //  return new HttpNotFoundResult(String.Format("No Batchname found for BatchKey: {0}", _BatchKey));
        //}



        //// Nach Datei suchen
        //sFileName = FILENAME_PREFIX + "_" + sBatchNumber + "_" + sBrewLine + "_1_" + sShortMaterial;


        //Microsoft.SqlServer.Dts.Runtime.Application app = new Microsoft.SqlServer.Dts.Runtime.Application();
        //Microsoft.SqlServer.Dts.Runtime.Package package = null;
        //MyEventListener eventListener = new MyEventListener();

        ////Load the SSIS Package which will be executed
        //app.PackagePassword = "ProAdmin777";

        //String sPackageFilePath = Path.Combine(sSourcePath, FOLDER_BIN, SSIS_PACKAGE);

        //// Execute
        //try
        //{
        //  // Load package
        //  package = app.LoadPackage(sPackageFilePath, eventListener);


        //  // Set values
        //  Variables vars = package.Variables;

        //  vars["User::InputBatchKey"].Value = nBatchKey;
        //  vars["User::InputDestinationFile"].Value = sFileName + "." + FILENAME_TYPE;
        //  vars["User::InputDestinationPath"].Value = sDestinationPath;
        //  vars["User::InputTemplateFilePath"].Value = Path.Combine(sSourcePath, FOLDER_TEMPLATE, EXCEL_TEMPLATE_NAME);
        //  vars["User::InputCreateLogFile"].Value = CreateLogFile;
        //  vars["User::InputLogFilePath"].Value = (logger != null) ? logger.FilePath : String.Empty;
        //  vars["User::Input_UpdateBatchState"].Value = true;

        //  // Log erzeugen
        //  if (logger != null)
        //  {
        //    logger.Log("InputBatchKey", vars["User::InputBatchKey"].Value.ToString());
        //    logger.Log("InputDestinationFile", vars["User::InputDestinationFile"].Value.ToString());
        //    logger.Log("InputDestinationPath", vars["User::InputDestinationPath"].Value.ToString());
        //    logger.Log("InputTemplateFilePath", vars["User::InputTemplateFilePath"].Value.ToString());
        //  }


        //  vars["InputToOverwrite"].Value = true;

        //  DTSExecResult results = package.Execute(null, null, eventListener, null, null);
        //}
        //catch (Exception ex)
        //{
        //  if (logger != null)
        //    logger.Log("Error", String.Format("Error: {0} // Innermessage: {1}", ex.Message, (ex.InnerException != null) ? ex.InnerException.Message : String.Empty));

        //  return new HttpNotFoundResult(String.Format("Error: {0} // Innermessage: {1}", ex.Message, (ex.InnerException != null) ? ex.InnerException.Message : String.Empty));
        //}


        return null;
      }

    
    }
}
