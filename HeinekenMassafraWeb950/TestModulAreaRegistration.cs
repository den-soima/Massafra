using System.Web.Mvc;

namespace PlantiT.Web.Template.Module
{
  public class TestModulAreaRegistration : AreaRegistration
  {
    public override string AreaName
    {
      get
      {
        return "TestModul";
      }
    }

    public override void RegisterArea(AreaRegistrationContext context)
    {
      context.MapRoute(
          "PlantiT.Web.Template.Module",
          "TestModul/{controller}/{action}/{id}",
          new { action = "Index", id = UrlParameter.Optional }
      );
    }
  }
}