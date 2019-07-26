using PlantiT.Web.Security;
using System;
using System.Collections.Generic;
using System.Linq;        
using System.Web.Mvc;                                    
using PlantiT.Web.Gateway;
using System.Net;

namespace PlantiT.Web.HeinekenMassafra.MES.Controllers
{
  public class
      TestFrontEndController : Controller
    {
        // GET: PlantiT.Web.HeinekenMassafra.MES/TestFrontEndController
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


    }
}
