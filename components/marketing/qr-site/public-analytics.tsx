"use client";

import Script from "next/script";

export function PublicAnalytics({
  ga4MeasurementId,
  gtmId,
  respectDnt
}: {
  ga4MeasurementId: string;
  gtmId: string;
  respectDnt: boolean;
}) {
  const enabled = `!${respectDnt} || !(navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.msDoNotTrack === "1")`;
  return <>
    {ga4MeasurementId ? <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4MeasurementId)}`} strategy="afterInteractive" />
      <Script id="qr24x7-ga4" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());if(${enabled})gtag('config','${ga4MeasurementId}',{anonymize_ip:true});` }} />
    </> : null}
    {gtmId ? <Script id="qr24x7-gtm" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `if(${enabled}){(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');}` }} /> : null}
  </>;
}
