"use client";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/app/components/AppHeader";

type Payment={id:string;subscriptionId:string|null;name:string;category:string;amount:number;paidOn:string;source:string};
const money=(value:number,digits=0)=>value.toLocaleString("en-AU",{style:"currency",currency:"AUD",maximumFractionDigits:digits});

export default function HistoryPage(){
  const [payments,setPayments]=useState<Payment[]>([]);
  const [loading,setLoading]=useState(true);
  const [period,setPeriod]=useState("12");

  useEffect(()=>{fetch("/api/history").then(response=>response.json()).then(setPayments).finally(()=>setLoading(false))},[]);

  const now=new Date();
  const allTimeMonths=payments.length?(()=>{
    const earliest=new Date([...payments].sort((a,b)=>a.paidOn.localeCompare(b.paidOn))[0].paidOn+"T12:00:00");
    return Math.max(1,(now.getFullYear()-earliest.getFullYear())*12+now.getMonth()-earliest.getMonth()+1);
  })():12;
  const monthCount=period==="all"?allTimeMonths:Number(period);
  const filtered=useMemo(()=>{
    if(period==="all")return payments;
    const start=new Date();start.setDate(1);start.setMonth(start.getMonth()-Number(period)+1);
    return payments.filter(payment=>new Date(payment.paidOn+"T12:00:00")>=start);
  },[payments,period]);
  const total=filtered.reduce((sum,payment)=>sum+payment.amount,0);
  const average=filtered.length?total/filtered.length:0;
  const currentYear=now.getFullYear();
  const yearTotal=payments.filter(payment=>Number(payment.paidOn.slice(0,4))===currentYear).reduce((sum,payment)=>sum+payment.amount,0);
  const largest=[...filtered].sort((a,b)=>b.amount-a.amount)[0];

  const monthKeys=Array.from({length:monthCount},(_,index)=>{
    const date=new Date();date.setDate(1);date.setMonth(date.getMonth()-monthCount+1+index);
    return {key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`,label:new Intl.DateTimeFormat("en-AU",{month:"short"}).format(date)};
  });
  const months=monthKeys.map(month=>({...month,total:filtered.filter(payment=>payment.paidOn.startsWith(month.key)).reduce((sum,payment)=>sum+payment.amount,0)}));
  const maxMonth=Math.max(...months.map(month=>month.total),1);
  const categories=Object.entries(filtered.reduce<Record<string,number>>((result,payment)=>{result[payment.category]=(result[payment.category]??0)+payment.amount;return result},{})).sort((a,b)=>b[1]-a[1]);

  return <><AppHeader active="history"/><main className="history-shell">
    <section className="history-intro"><div><em>PAYMENT HISTORY</em><h1>What you actually spent.</h1><p>Completed scheduled renewals recorded by Subtrack.</p></div><label className="period-control">Period<select value={period} onChange={event=>setPeriod(event.target.value)}><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option><option value="all">All time</option></select></label></section>
    {loading?<div className="insights-loading">Loading payment history...</div>:<>
      <section className="insight-stats history-kpis">
        <article><span className="stat-label">SPEND IN PERIOD</span><strong>{money(total,2)}</strong><p>{filtered.length} recorded payments</p></article>
        <article><span className="stat-label">THIS YEAR</span><strong>{money(yearTotal,2)}</strong><p>Since 1 January {currentYear}</p></article>
        <article><span className="stat-label">AVERAGE PAYMENT</span><strong>{money(average,2)}</strong><p>Across the selected period</p></article>
        <article><span className="stat-label">LARGEST PAYMENT</span><strong>{largest?money(largest.amount,2):money(0)}</strong><p>{largest?.name??"No payments yet"}</p></article>
      </section>
      <section className="history-grid">
        <article className="insight-panel history-chart-panel"><div className="panel-heading"><div><h2>Monthly spending</h2><p>{period==="all"?"All recorded months":`Last ${period} months`}</p></div></div><div className="history-bars">{months.map(month=><div key={month.key}><span>{month.total?money(month.total):""}</span><div><i style={{height:`${Math.max(month.total/maxMonth*100,month.total?4:0)}%`}}/></div><b>{month.label}</b></div>)}</div></article>
        <article className="insight-panel"><div className="panel-heading"><div><h2>Spend by category</h2><p>Selected period</p></div></div>{categories.length?<div className="category-chart">{categories.map(([category,value])=><div className="category-line" key={category}><div><span>{category}</span><strong>{money(value,2)}</strong></div><div className="category-track"><i style={{width:`${total?value/total*100:0}%`}}/></div><small>{total?Math.round(value/total*100):0}% of recorded spend</small></div>)}</div>:<EmptyHistory/>}</article>
      </section>
      <section className="history-list"><div className="panel-heading"><div><h2>Payment ledger</h2><p>Newest payments first</p></div></div>{filtered.length?<div>{filtered.map(payment=><article key={payment.id}><span className="history-date">{new Intl.DateTimeFormat("en-AU",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(payment.paidOn+"T12:00:00"))}</span><span className="history-service"><i>{payment.name[0]}</i><span><b>{payment.name}</b><small>{payment.category}</small></span></span><strong>{money(payment.amount,2)}</strong></article>)}</div>:<EmptyHistory/>}</section>
      <p className="projection-note">History begins when Subtrack starts observing completed renewal dates. It does not manufacture payments from before tracking was enabled.</p>
    </>}
  </main></>;
}
function EmptyHistory(){return <div className="history-empty"><b>◎</b><p>No recorded payments in this period yet.</p></div>}
