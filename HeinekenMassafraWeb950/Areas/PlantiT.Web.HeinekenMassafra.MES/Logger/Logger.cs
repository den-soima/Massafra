using System;
using System.Xml;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.IO;

namespace PlantiT.Web.HeinekenMassafra.Areas.PlantiT.Web.HeinekenMassafra.MES.Logger
{


    public class Logger
    {
      private readonly object m_locker = new object();
      private XmlDocument m_doc = new XmlDocument();
      private string m_filePath = String.Empty;
      private bool m_bOverwrite = false;

      public string FilePath { get { return this.m_filePath; } }

      public Logger(String filePath, bool bOverwrite = false)
      {
        this.m_filePath = filePath;
        this.m_bOverwrite = bOverwrite;
        init();
      }

      private void init()
      {
        // wenn Datei überschrieben werden soll, zunaechst entfernen
        if (m_bOverwrite && File.Exists(this.m_filePath))
          File.Delete(this.m_filePath);

        // ggf. laden
        if (File.Exists(this.m_filePath))
          m_doc.Load(this.m_filePath);
        else
        {  
          // Ansonsten erzeugen        
          var root = m_doc.CreateElement("Log");
          m_doc.AppendChild(root);
        }
      }

      public void Log(string type, string text)
      {   
        lock (m_locker)
        {
          var el = (XmlElement)m_doc.DocumentElement.AppendChild(m_doc.CreateElement(type));                   
          el.InnerText = text;
          m_doc.Save(this.m_filePath);
        }
      }
    }

    
}