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

  public class DataExportController : Controller
    {
    class MyEventListener : DefaultEvents
    {
      public override bool OnError(DtsObject source, int errorCode, string subComponent,
          string description, string helpFile, int helpContext, string idofInterfaceWithError)
      {
       // Todo
       // Logger log = new Logger("C:\\LOG\\log2.txt");
       // log.Log("Ex in Package",String.Format("Error in {0}/{1} : {2}", source, subComponent, description));
       return base.OnError(source, errorCode, subComponent, description, helpFile, helpContext, idofInterfaceWithError);
      }
    } 

      // GET: PlantiT.Web.HeinekenMassafra.MES/SAPInterfaceController
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
      public ActionResult DownloadBatchOverviewReport(String _TemplateKey, String _1stBatchKey, String _2ndBatchKey, String _BatchTypeKey, String _MaterialKey, String StartTime, String EndTime, bool CreateLogFile = false)
      {
        const string FILENAME_PREFIX = "BatchOverview_";
		//const string FILENAME_PREFIX = "BatchOverview";
        const string FILENAME_TYPE = "xlsx";
        const string EXCEL_TEMPLATE_NAME = "ExcelReport_BatchOverview_Template.xlsx";
        const string SSIS_PACKAGE = "ExcelReport_BatchOverview.dtsx";
        const string FOLDER_BASE_SOURCE = "Areas\\PlantiT.Web.HeinekenMassafra.MES\\Excel";
        const string FOLDER_BIN = "bin";
        const string FOLDER_TEMPLATE = "template";
        const string FOLDER_BASE_OUTPUT = "Areas\\PlantiT.Web.HeinekenMassafra.MES\\Excel\\output";
		//const string FOLDER_BASE_OUTPUT = "Areas\\PlantiT.Web.HeinekenMassafra.MES\\Excel\\output\\";
        const string LOG_FILE_NAME = "DownloadBatchOverview_Log.txt";
        

        const int WAITTIME_IN_MS = 1000;
        const int MAXWAITTIME_IN_MS = 30000;

        String sLocation = Assembly.GetExecutingAssembly().Location;  // Get current directory                          

        Logger logger = null;

        long nTemplateKey = 0;
        long n1stBatchKey = 0;
        long n2ndBatchKey = 0;
        long nBatchTypeKey = 0;
        long nMaterialKey = 0;
        DateTime dtStartTime = DateTime.MaxValue;
        DateTime dtEndTime = DateTime.MinValue;

        string sSourcePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, FOLDER_BASE_SOURCE);
        string sDestinationPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, FOLDER_BASE_OUTPUT);
        string sDestinationFilePath = String.Empty;
        string sFileName = String.Empty;

        DateTime dtCheckTime = DateTime.Now;
                                                       
        // Log generieren
        if (CreateLogFile)
          logger = new Logger(Path.Combine(sDestinationPath, LOG_FILE_NAME), true);


        // Parameter ermitteln
        // TemplateKey
        try
        {
          nTemplateKey = Convert.ToInt64(_TemplateKey);
        }
        catch { }

        // 1stBatchKey
        try
        {
          n1stBatchKey = Convert.ToInt64(_1stBatchKey);
        }
        catch { }

        // 2ndBatchKey
        try
        {
          n2ndBatchKey = Convert.ToInt64(_2ndBatchKey);
        }
        catch { }

        // BatchTypeKey
        try
        {
          nBatchTypeKey = Convert.ToInt64(_BatchTypeKey);
        }
        catch { }

        // MaterialKey
        try
        {
          nMaterialKey = Convert.ToInt64(_MaterialKey);
        }
        catch { }

        // StartTime
        try
        {
          dtStartTime = Convert.ToDateTime(StartTime);
        }
        catch { }

        // EndTime
        try
        {
          dtEndTime = Convert.ToDateTime(EndTime);
        }
        catch { }



        // Nach Datei suchen
        sFileName = FILENAME_PREFIX + DateTime.Now.ToString().Replace(":", "").Replace('/', '.').Replace('-', '.');
		//sFileName = FILENAME_PREFIX;

        Microsoft.SqlServer.Dts.Runtime.Application app = new Microsoft.SqlServer.Dts.Runtime.Application();
        Microsoft.SqlServer.Dts.Runtime.Package package = null;
        MyEventListener eventListener = new MyEventListener();

        //Load the SSIS Package which will be executed
        app.PackagePassword = "ProAdmin777";
                                                                     
        String sPackageFilePath = Path.Combine(sSourcePath, FOLDER_BIN, SSIS_PACKAGE);

        // Execute
        try
        {
          // Load package
          package = app.LoadPackage(sPackageFilePath, eventListener);


          // Set values
          Variables vars = package.Variables;

          vars["User::InputTemplateKey"].Value = nTemplateKey;
          vars["User::Input1stBatchKey"].Value = n1stBatchKey;
          vars["User::Input2ndBatchKey"].Value = n2ndBatchKey;
          vars["User::InputBatchTypeKey"].Value = nBatchTypeKey;
          vars["User::InputMaterialKey"].Value = nMaterialKey;
          vars["User::InputStartTime"].Value = dtStartTime;
          vars["User::InputEndTime"].Value = dtEndTime;



          vars["User::InputDestinationFile"].Value = sFileName + "." + FILENAME_TYPE;
          vars["User::InputDestinationPath"].Value = sDestinationPath;
          vars["User::InputTemplateFilePath"].Value = Path.Combine(sSourcePath, FOLDER_TEMPLATE, EXCEL_TEMPLATE_NAME);
          vars["User::InputCreateLogFile"].Value = CreateLogFile;
          vars["User::InputLogFilePath"].Value = (logger != null) ? logger.FilePath : String.Empty;

          // Log erzeugen
          if (logger != null)
          {
            logger.Log("InputTemplateKey", vars["User::InputTemplateKey"].Value.ToString());
            logger.Log("Input1stBatchKey", vars["User::Input1stBatchKey"].Value.ToString());
            logger.Log("Input2ndBatchKey", vars["User::Input2ndBatchKey"].Value.ToString());
            logger.Log("InputBatchTypeKey", vars["User::InputBatchTypeKey"].Value.ToString());
            logger.Log("InputMaterialKey", vars["User::InputMaterialKey"].Value.ToString());
            logger.Log("InputStartTime", vars["User::InputStartTime"].Value.ToString());
            logger.Log("InputEndTime", vars["User::InputEndTime"].Value.ToString());

            logger.Log("InputDestinationFile", vars["User::InputDestinationFile"].Value.ToString());
            logger.Log("InputDestinationPath", vars["User::InputDestinationPath"].Value.ToString());
            logger.Log("InputTemplateFilePath", vars["User::InputTemplateFilePath"].Value.ToString());
          }


          vars["InputToOverwrite"].Value = true;

          DTSExecResult results = package.Execute(null, null, eventListener, null, null);
        }
        catch (Exception ex)
        {
          if (logger != null)
            logger.Log("Error", String.Format("Error: {0} // Innermessage: {1}", ex.Message, (ex.InnerException != null) ? ex.InnerException.Message : String.Empty));

          return new HttpNotFoundResult(String.Format("Error: {0} // Innermessage: {1}", ex.Message, (ex.InnerException != null) ? ex.InnerException.Message : String.Empty));
        }

        // zyklisch prüfen ob Datei vorhanden ist, maximal  MAXWAITTIME_IN_MS
        for (int i = 0; i < MAXWAITTIME_IN_MS; i += WAITTIME_IN_MS)
        {
                if (package.Errors.Count > 0)
                {
                    foreach (var item in package.Errors)
                    {
                        if (logger != null)
                            logger.Log("Error", item.Description);
                    }
                    break;
                }

          // erstmal eine Sekunde zeit geben, zyklisch prüfen
          System.Threading.Thread.Sleep(WAITTIME_IN_MS);

          // alle Dateien des Pfades holen die dem Suchmuster entsprechen
          DirectoryInfo dirInfo = new DirectoryInfo(Path.Combine(sDestinationPath));
          var filesInPath = dirInfo.EnumerateFiles(String.Format("{0}*.{1}", sFileName, FILENAME_TYPE));

          var file = filesInPath.Where(x => x.Name.Contains(sFileName)).OrderByDescending(x => x.LastWriteTime).FirstOrDefault();

          // nur welche die eben erstellt wurde
          if (file == null)
            continue;

          // Falls eben erstellt...
          if (file.LastWriteTime >= dtCheckTime)
          {
            // gefunden, Abbruch
            sFileName = file.Name;
            break;
          }
        }

        // Pfad mit Datei erzeugen
        sDestinationFilePath = Path.Combine(sDestinationPath, sFileName);

        // Datei vorhanden?
        if (!System.IO.File.Exists(sDestinationFilePath))
        {
          return new HttpNotFoundResult("Excel file could not created!");
        }

        // Create data return stream
        byte[] fileData = System.IO.File.ReadAllBytes(sDestinationFilePath);
        string contentType = System.Web.MimeMapping.GetMimeMapping(sDestinationFilePath);

        // Datei entfernen
        System.IO.File.Delete(sDestinationFilePath);

        var cd = new System.Net.Mime.ContentDisposition()
        {
          // for example foo.bak
          FileName = sFileName,

          // always prompt the user for downloading, set to true if you want 
          // the browser to try to show the file inline
          Inline = false,
        };
        Response.AppendHeader("Content-Disposition", cd.ToString());
        return File(fileData, contentType);
      }


    /// <summary>
    /// Erstellt neuen Excel Bericht
    /// </summary>
    /// <returns></returns>
    [HttpGet]
    public ActionResult DownloadBatchOverviewReport_NEW(String _TemplateKey, String _1stBatchKey, String _2ndBatchKey, String _BatchTypeKey, String _MaterialKey, String StartTime, String EndTime, bool CreateLogFile = true)
    {
      const string FILENAME_PREFIX = "BatchOverview_";
      //const string FILENAME_PREFIX = "BatchOverview";
      const string FILENAME_TYPE = "xlsx";
      const string EXCEL_TEMPLATE_NAME = "BatchOV_Template_NEW.xlsx";
      const string SSIS_PACKAGE = "NEW_ExcelReport_BatchOverview.dtsx";
      //const string FOLDER_BASE_SOURCE = "Areas\\PlantiT.Web.HeinekenMassafra.MES\\Excel";
      const string FOLDER_BASE_SOURCE = "\\\\IT1SBGYBRWSRV02\\UserExcelReports";
      const string FOLDER_BIN = "bin";
      const string FOLDER_TEMPLATE = "template";
      //const string FOLDER_BASE_OUTPUT = "Areas\\PlantiT.Web.HeinekenMassafra.MES\\Excel\\output";
      const string FOLDER_BASE_OUTPUT = "\\\\IT1SBGYBRWSRV02\\UserExcelReports\\output";
      const string LOG_FILE_NAME = "DownloadBatchOverview_Log.txt";
      const string LOG_FILE_NAME_SSIS = "DownloadBatchOverviewSSIS_Log.txt";

      const int WAITTIME_IN_MS = 1000;
      const int MAXWAITTIME_IN_MS = 30000;

      String sLocation = Assembly.GetExecutingAssembly().Location;  // Get current directory                          

      Logger logger = null;

      long nTemplateKey = 0;
      long n1stBatchKey = 0;
      long n2ndBatchKey = 0;
      long nBatchTypeKey = 0;
      long nMaterialKey = 0;
      DateTime dtStartTime = DateTime.MaxValue;
      DateTime dtEndTime = DateTime.MinValue;

    //string sSourcePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, FOLDER_BASE_SOURCE);
    //string sDestinationPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, FOLDER_BASE_OUTPUT);
    string sSourcePath = FOLDER_BASE_SOURCE;
    string sDestinationPath = FOLDER_BASE_OUTPUT;
    string sDestinationFilePath = String.Empty;
      string sFileName = String.Empty;

      DateTime dtCheckTime = DateTime.Now;

      // Log generieren
      if (CreateLogFile)
        logger = new Logger(Path.Combine(sDestinationPath, LOG_FILE_NAME), true);


      // Parameter ermitteln
      // TemplateKey
      try
      {
        nTemplateKey = Convert.ToInt64(_TemplateKey);
      }
      catch { }

      // 1stBatchKey
      try
      {
        n1stBatchKey = Convert.ToInt64(_1stBatchKey);
      }
      catch { }

      // 2ndBatchKey
      try
      {
        n2ndBatchKey = Convert.ToInt64(_2ndBatchKey);
      }
      catch { }

      // BatchTypeKey
      try
      {
        nBatchTypeKey = Convert.ToInt64(_BatchTypeKey);
      }
      catch { }

      // MaterialKey
      try
      {
        nMaterialKey = Convert.ToInt64(_MaterialKey);
      }
      catch { }

      // StartTime
      try
      {
        dtStartTime = Convert.ToDateTime(StartTime);
      }
      catch { }

      // EndTime
      try
      {
        dtEndTime = Convert.ToDateTime(EndTime);
      }
      catch { }



       // Nach Datei suchen
    sFileName = FILENAME_PREFIX + DateTime.Now.ToString().Replace(":", "").Replace('/', '.').Replace('-', '.');
    //sFileName = FILENAME_PREFIX;

      Microsoft.SqlServer.Dts.Runtime.Application app = new Microsoft.SqlServer.Dts.Runtime.Application();
      Microsoft.SqlServer.Dts.Runtime.Package package = null;
      MyEventListener eventListener = new MyEventListener();

      //Load the SSIS Package which will be executed
      app.PackagePassword = "ProAdmin777";

      String sPackageFilePath = Path.Combine(sSourcePath, FOLDER_BIN, SSIS_PACKAGE);

      // Execute
      try
      {
        // Load package
        package = app.LoadPackage(sPackageFilePath, eventListener);


        // Set values
        Variables vars = package.Variables;

        vars["User::InputTemplateKey"].Value = nTemplateKey;
        vars["User::Input1stBatchKey"].Value = n1stBatchKey;
        vars["User::Input2ndBatchKey"].Value = n2ndBatchKey;
        vars["User::InputBatchTypeKey"].Value = nBatchTypeKey;
        vars["User::InputMaterialKey"].Value = nMaterialKey;
        vars["User::InputStartTime"].Value = dtStartTime;
        vars["User::InputEndTime"].Value = dtEndTime;



        vars["User::InputDestinationFile"].Value = sFileName + "." + FILENAME_TYPE;
        vars["User::InputDestinationPath"].Value = sDestinationPath;
        vars["User::InputTemplateFilePath"].Value = Path.Combine(sSourcePath, FOLDER_TEMPLATE, EXCEL_TEMPLATE_NAME);
        vars["User::InputCreateLogFile"].Value = CreateLogFile;
        vars["User::InputLogFilePath"].Value = Path.Combine(sDestinationPath, LOG_FILE_NAME_SSIS);//(logger != null) ? logger.FilePath : String.Empty;

        // Log erzeugen
        if (logger != null)
        {
          logger.Log("SSIS_Package", sPackageFilePath); 
          logger.Log("InputTemplateKey", vars["User::InputTemplateKey"].Value.ToString());
          logger.Log("Input1stBatchKey", vars["User::Input1stBatchKey"].Value.ToString());
          logger.Log("Input2ndBatchKey", vars["User::Input2ndBatchKey"].Value.ToString());
          logger.Log("InputBatchTypeKey", vars["User::InputBatchTypeKey"].Value.ToString());
          logger.Log("InputMaterialKey", vars["User::InputMaterialKey"].Value.ToString());
          logger.Log("InputStartTime", vars["User::InputStartTime"].Value.ToString());
          logger.Log("InputEndTime", vars["User::InputEndTime"].Value.ToString());

          logger.Log("InputDestinationFile", vars["User::InputDestinationFile"].Value.ToString());
          logger.Log("InputDestinationPath", vars["User::InputDestinationPath"].Value.ToString());
          logger.Log("InputTemplateFilePath", vars["User::InputTemplateFilePath"].Value.ToString());
          logger.Log("InputCreateLogFile", vars["User::InputCreateLogFile"].Value.ToString());
          logger.Log("InputLogFilePath", vars["User::InputLogFilePath"].Value.ToString());
        }


        vars["InputToOverwrite"].Value = true;

        DTSExecResult results = package.Execute(null, null, eventListener, null, null);
      }
      catch (Exception ex)
      {
        if (logger != null)
          logger.Log("Error", String.Format("Error: {0} // Innermessage: {1}", ex.Message, (ex.InnerException != null) ? ex.InnerException.Message : String.Empty));

        return new HttpNotFoundResult(String.Format("Error: {0} // Innermessage: {1}", ex.Message, (ex.InnerException != null) ? ex.InnerException.Message : String.Empty));
      }

            //zyklisch prüfen ob Datei vorhanden ist, maximal  MAXWAITTIME_IN_MS
            //cyclically check if file exists, max.MAXWAITTIME_IN_MS
                for (int i = 0; i < MAXWAITTIME_IN_MS; i += WAITTIME_IN_MS)
            {
                // erstmal eine Sekunde zeit geben, zyklisch prüfen
                // first give a second time, check cyclically
                System.Threading.Thread.Sleep(WAITTIME_IN_MS);

                // alle Dateien des Pfades holen die dem Suchmuster entsprechen
                //Get all files of the path that match the search pattern
                DirectoryInfo dirInfo = new DirectoryInfo(Path.Combine(sDestinationPath));
                var filesInPath = dirInfo.EnumerateFiles(String.Format("{0}*.{1}", sFileName, FILENAME_TYPE));

                var file = filesInPath.Where(x => x.Name.Contains(sFileName)).OrderByDescending(x => x.LastWriteTime).FirstOrDefault();

                // nur welche die eben erstellt wurde
                // only which was just created
                if (file == null)
                    continue;

                // Falls eben erstellt...
                // if just created
                if (file.LastWriteTime >= dtCheckTime)
                {
                    // gefunden, Abbruch
                    // found, demolition
                    sFileName = file.Name;
                    break;
                }
            }



            // Pfad mit Datei erzeugen
            // Create path with file
            sDestinationFilePath = Path.Combine(sDestinationPath, sFileName);

            // File available?
            if (!System.IO.File.Exists(sDestinationFilePath))
            {
                return new HttpNotFoundResult("Excel file could not created!");
                //return new HttpNotFoundResult(sDestinationFilePath);
            }

            // Create data return stream
            byte[] fileData = System.IO.File.ReadAllBytes(sDestinationFilePath);
            string contentType = System.Web.MimeMapping.GetMimeMapping(sDestinationFilePath);

            // Datei entfernen
            System.IO.File.Delete(sDestinationFilePath);

            var cd = new System.Net.Mime.ContentDisposition()
            {
                // for example foo.bak
                FileName = sFileName,

                // always prompt the user for downloading, set to true if you want 
                // the browser to try to show the file inline
                Inline = false,
            };
            Response.AppendHeader("Content-Disposition", cd.ToString());
            return File(fileData, contentType);
        }


  }
}
