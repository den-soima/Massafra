using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace PlantiT.Web.HeinekenMassafra.Areas.PlantiT.Web.HeinekenMassafra.MES.Models
{
  public class CODataResponse<T> where T : class
  {
  
    [Newtonsoft.Json.JsonProperty("odata.metadata")]
    public string Metadata { get; set; }
    public List<T> Value { get; set; }
  }
}