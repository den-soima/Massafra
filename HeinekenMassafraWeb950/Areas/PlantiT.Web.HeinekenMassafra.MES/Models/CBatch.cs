using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace PlantiT.Web.HeinekenMassafra.Areas.PlantiT.Web.HeinekenMassafra.MES.Models
{
  public class CBatch
  {
    public long _BatchKey { get; set; }
    public string BatchName { get; set; }
    public string SAPMaterial { get; set; }
    public string SAP_Batch { get; set; }
    public DateTime BatchProcessStartTime { get; set; }
  }
}