using PlantiT.Web.Security;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;
using PlantiT.Web.Gateway;
using System.Net;
using System.Web.Routing;
using System.Threading.Tasks;
using PlantiT.Web.Configuration;
using PlantiT.Web.Models;

namespace PlantiT.Web.HeinekenMassafra.MES.Controllers
{

        public class MaintainTemplateController  : Controller 
        {

        IConfigurationProvider configurationProvider;
        public MaintainTemplateController(PlantiT.Web.Configuration.IConfigurationProvider configurationProvider)
        {
            this.configurationProvider = configurationProvider;
        }

        // GET: PlantiT.Web.HeinekenMassafra.MES/MaintainTemplateController
        public virtual async Task<ActionResult> Index(long ml) 
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


		Models.Database.MenuItem menuItem = this.configurationProvider.GetCurrentMenuItem(ml);
		System.Web.Routing.RouteValueDictionary routeValues = menuItem.GetRouteValues(true);
		String select_usage = routeValues["select_usage"].ToString();
 
        ViewBag.GatewayPath = gatewayConnection.BaseUri;
        ViewBag.select_usage = select_usage;
        return View();
    }


}
}
