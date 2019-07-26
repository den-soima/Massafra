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

  public class DrillInController : Controller
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

    // GET: PlantiT.Web.HeinekenMassafra.MES/DrillInController
      public ActionResult Index(string BatchKey,string ConfigKey)
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

        try
        {
          ViewBag.BatchKey = Int64.Parse(BatchKey);
          ViewBag.ConfigKey = Int64.Parse(ConfigKey);
        }
        catch (Exception)
        {
           return new HttpStatusCodeResult(HttpStatusCode.Conflict, "Parameter type not correct");
        }

        return View();                                                          
      }

    }
}
