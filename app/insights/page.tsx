"use client";
import { AppHeader } from "@/app/components/AppHeader";
import { useEffect, useMemo, useState } from "react";

type Cycle="weekly"|"fortnightly"|"monthly"|"yearly";
type Subscription = {
  id:string; name:string; price:number; cycle:Cycle;
  next:string; category:string; color:string; active:boolean;
};
const currency=(value:number,digits=0)=>value.toLocaleString("en-AU",{style:"currency",currency:"AUD",maximumFractionDigits:digits});
const annualMultiplier:Record<Cycle,number>={weekly:52,fortnightly:26,monthly:12,yearly:1};
const annual=(item:Subscription)=>item.price*annualMultiplier[item.cycle];
const advance=(date:Date,cycle:Cycle)=>{
  const next=new Date(date);
  if(cycle==="weekly")next.setDate(next.getDate()+7);
  else if(cycle==="fortnightly")next.setDate(next.getDate()+14);
  else if(cycle==="monthly")next.setMonth(next.getMonth()+1);
  else next.setFullYear(next.getFullYear()+1);
  return next;
};

export default function InsightsPage(){
  const [subscriptions,setSubscriptions]=useState<Subscription[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    fetch("/api/subscriptions")
      .then(response=>response.json())
      .then(setSubscriptions)
      .finally(()=>setLoading(false));
  },[]);

  const active=useMemo(()=>subscriptions.filter(item=>item.active),[subscriptions]);
  const annualTotal=active.reduce((sum,item)=>sum+annual(item),0);
  const monthlyEquivalent=annualTotal/12;
  const today=new Date();
  today.setHours(0,0,0,0);
  const dueEnd=new Date(today);
  dueEnd.setDate(dueEnd.getDate()+30);
  const duePayments=active.flatMap(item=>{
    const payments:number[]=[];
    let renewal=new Date(item.next+"T12:00:00");
    while(renewal<=dueEnd){if(renewal>=today)payments.push(item.price);renewal=advance(renewal,item.cycle);}
    return payments;
  });
  const dueSoonTotal=duePayments.reduce((sum,price)=>sum+price,0);

  const categories=Object.entries(active.reduce<Record<string,number>>((result,item)=>{
    result[item.category]=(result[item.category]??0)+annual(item);
    return result;
  },{})).sort((a,b)=>b[1]-a[1]);
  const largest=[...active].sort((a,b)=>annual(b)-annual(a)).slice(0,5);

  const months=Array.from({length:6},(_,index)=>{
    const date=new Date();
    date.setDate(1);
    date.setMonth(date.getMonth()+index);
    const monthEnd=new Date(date);
    monthEnd.setMonth(monthEnd.getMonth()+1);
    const total=active.reduce((sum,item)=>{
      let renewal=new Date(item.next+"T12:00:00");
      while(renewal<date)renewal=advance(renewal,item.cycle);
      let itemTotal=0;
      while(renewal<monthEnd){
        itemTotal+=item.price;
        renewal=advance(renewal,item.cycle);
      }
      return sum+itemTotal;
    },0);
    return {label:new Intl.DateTimeFormat("en-AU",{month:"short"}).format(date),total};
  });
  const maxMonth=Math.max(...months.map(month=>month.total),1);
  const cadence=(["weekly","fortnightly","monthly","yearly"] as Cycle[]).map(cycle=>({cycle,count:active.filter(item=>item.cycle===cycle).length}));

  return <>
    <AppHeader active="insights"/>
    <main className="insights-shell">
      <section className="insights-intro">
        <div><em>SPENDING INSIGHTS</em><h1>See the shape of<br/>your subscriptions.</h1><p>Forward-looking costs based on your active billing schedule.</p></div>
        <span className="projection-pill">Projected, not historical</span>
      </section>
      {loading?<div className="insights-loading">Calculating your forecast...</div>:<>
        <section className="insight-stats">
          <article><span className="stat-label">MONTHLY EQUIVALENT</span><strong>{currency(monthlyEquivalent,2)}</strong><p>Normalised across billing cycles</p></article>
          <article><span className="stat-label">ANNUAL FORECAST</span><strong>{currency(annualTotal)}</strong><p>{active.length} active subscriptions</p></article>
          <article><span className="stat-label">AVERAGE SUBSCRIPTION</span><strong>{currency(active.length?annualTotal/active.length:0)}</strong><p>Annual cost per service</p></article>
          <article><span className="stat-label">DUE IN 30 DAYS</span><strong>{currency(dueSoonTotal,2)}</strong><p>{duePayments.length} upcoming payments</p></article>
        </section>

        <section className="insight-grid">
          <article className="insight-panel projection-panel">
            <div className="panel-heading"><div><h2>Six-month projection</h2><p>Expected charges by calendar month</p></div><strong>{currency(months.reduce((sum,month)=>sum+month.total,0))}</strong></div>
            <div className="month-chart">{months.map(month=><div className="month-column" key={month.label}><span className="month-value">{currency(month.total)}</span><div className="month-track"><i style={{height:`${Math.max(month.total/maxMonth*100,4)}%`}}/></div><b>{month.label}</b></div>)}</div>
          </article>

          <article className="insight-panel">
            <div className="panel-heading"><div><h2>Category mix</h2><p>Share of annual forecast</p></div></div>
            <div className="category-chart">{categories.map(([category,value],index)=><div className="category-line" key={category}><div><span><i style={{background:["#208962","#8b6fe8","#e5844f","#4d91d9","#d5a62b"][index%5]}}/>{category}</span><strong>{currency(value)}</strong></div><div className="category-track"><i style={{width:`${annualTotal?value/annualTotal*100:0}%`}}/></div><small>{annualTotal?Math.round(value/annualTotal*100):0}% of annual spend</small></div>)}</div>
          </article>

          <article className="insight-panel">
            <div className="panel-heading"><div><h2>Costliest subscriptions</h2><p>Ranked by annualised cost</p></div></div>
            <div className="ranking">{largest.map((item,index)=><div key={item.id}><span className="rank">{String(index+1).padStart(2,"0")}</span><i style={{background:item.color}}>{item.name[0]}</i><span><b>{item.name}</b><small>{item.category}</small></span><strong>{currency(annual(item))}/yr</strong></div>)}</div>
          </article>

          <article className="insight-panel cadence-panel">
            <div className="panel-heading"><div><h2>Billing cadence</h2><p>How often charges recur</p></div></div>
            <div className="cadence-list">{cadence.map(item=><span key={item.cycle}><b>{item.count}</b>{item.cycle}</span>)}</div>
            <div className="insight-callout"><strong>{currency(dueSoonTotal,2)}</strong><p>will leave your account over the next 30 days.</p></div>
          </article>
        </section>
        <p className="projection-note">Projections use current prices and renewal schedules. To report actual historical spend, Subtrack will need a payment ledger or transaction import.</p>
      </>}
    </main>
  </>;
}
