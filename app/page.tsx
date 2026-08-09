/* eslint-disable jsx-a11y/label-has-associated-control, jsx-a11y/no-static-element-interactions, jsx-a11y/no-autofocus */

"use client";
import {FormEvent,useEffect,useState} from "react";
import { AppHeader } from "@/app/components/AppHeader";
type Cycle="weekly"|"fortnightly"|"monthly"|"yearly";
type S={id:string;name:string;price:number;cycle:Cycle;next:string;category:string;color:string;active:boolean};
const cats=["Entertainment","Software","Health","Utilities","Other"];
const cycleAnnual:Record<Cycle,number>={weekly:52,fortnightly:26,monthly:12,yearly:1};
const cycleShort:Record<Cycle,string>={weekly:"wk",fortnightly:"2wk",monthly:"mo",yearly:"yr"};
const palette=["#208962","#4d91d9","#8b6fe8","#e54747","#ed824f","#c09024","#397e8f","#a85f8e"];
const colorFor=(name:string)=>palette[[...name.toLowerCase()].reduce((hash,char)=>(hash*31+char.charCodeAt(0))>>>0,0)%palette.length];
const annual=(s:S)=>s.price*cycleAnnual[s.cycle],money=(n:number,d=2)=>n.toLocaleString("en-AU",{style:"currency",currency:"AUD",maximumFractionDigits:d}),days=(x:string)=>Math.ceil((new Date(x+"T12:00:00").getTime()-new Date().setHours(0,0,0,0))/86400000);
const upcoming=(s:S)=>{
  const amounts:number[]=[],end=new Date();end.setHours(23,59,59,999);end.setDate(end.getDate()+30);
  const date=new Date(s.next+"T12:00:00");
  while(date<=end){
    if(date>=new Date(new Date().setHours(0,0,0,0)))amounts.push(s.price);
    if(s.cycle==="weekly")date.setDate(date.getDate()+7);else if(s.cycle==="fortnightly")date.setDate(date.getDate()+14);else if(s.cycle==="monthly")date.setMonth(date.getMonth()+1);else date.setFullYear(date.getFullYear()+1);
  }
  return amounts;
};
export default function Home(){const [subs,setSubs]=useState<S[]>([]),[ready,setReady]=useState(false),[q,setQ]=useState(""),[filter,setFilter]=useState("Active"),[sort,setSort]=useState("next"),[edit,setEdit]=useState<S|null|undefined>(),[note,setNote]=useState("");
useEffect(()=>{
  const load=()=>fetch("/api/subscriptions")
    .then(async response=>{if(!response.ok)throw new Error("Unable to load subscriptions");return response.json()})
    .then(setSubs)
    .catch(()=>setNote("Database unavailable"))
    .finally(()=>setReady(true));
  load();
  const timer=window.setInterval(load,60*60*1000);
  window.addEventListener("focus",load);
  return()=>{window.clearInterval(timer);window.removeEventListener("focus",load)};
},[]);
const activeSubs=subs.filter(s=>s.active),total=activeSubs.reduce((n,s)=>n+annual(s),0),up=activeSubs.flatMap(upcoming),shown=subs.filter(s=>(filter==="Inactive"?!s.active:s.active&&(filter==="Active"||s.category===filter))&&s.name.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>sort==="price-desc"?b.price-a.price:sort==="price-asc"?a.price-b.price:sort==="annual-desc"?annual(b)-annual(a):sort==="name"?a.name.localeCompare(b.name):sort==="category"?a.category.localeCompare(b.category)||a.name.localeCompare(b.name):a.next.localeCompare(b.next));
const save=async(s:S)=>{const response=await fetch("/api/subscriptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(!response.ok){setNote("Save failed");return}const saved:S=await response.json();setSubs(v=>v.some(x=>x.id===saved.id)?v.map(x=>x.id===saved.id?saved:x):[...v,saved]);setEdit(undefined);setNote(saved.active?"Subscription saved":"Subscription marked inactive");setTimeout(()=>setNote(""),2000)},remove=async(s:S)=>{if(!confirm(`Delete ${s.name} permanently? Recorded payment history will be kept.`))return;const response=await fetch(`/api/subscriptions?id=${s.id}`,{method:"DELETE"});if(response.ok){setSubs(items=>items.filter(item=>item.id!==s.id));setEdit(undefined);setNote("Subscription deleted");setTimeout(()=>setNote(""),2000)}},backup=()=>{window.location.href="/api/system/data"};
return <><AppHeader active="subscriptions"/><main><section className="intro"><div><em>YOUR SUBSCRIPTIONS</em><h1>Know where your<br/>money goes.</h1><p>A calm, private view of every recurring payment - before it renews.</p></div><button className="primary intro-action" onClick={()=>setEdit(null)}>+ Add subscription</button></section>
<section className="stats"><article className="dark"><label>MONTHLY SPEND</label><strong>{money(total/12)}</strong><p>Across {activeSubs.length} active subscriptions</p><div className="bars">{[35,54,43,70,61,83,73,94].map((h,i)=><i key={i} style={{height:h+"%"}}/>)}</div></article><article><label>DUE IN 30 DAYS</label><strong>{money(up.reduce((n,price)=>n+price,0))}</strong><p>{up.length} upcoming payments</p></article><article><label>YEARLY TOTAL</label><strong>{money(total,0)}</strong><p>That is {money(total/365)} per day</p><div className="ring">2026</div></article></section>
<section><div className="heading"><div><h2>Subscriptions</h2></div><div className="tabletools"><label className="search"><span aria-hidden="true">&#8981;</span><input aria-label="Search" placeholder="Search subscriptions" value={q} onChange={e=>setQ(e.target.value)}/></label><label className="sort-control"><span>Sort by</span><select aria-label="Sort subscriptions" value={sort} onChange={e=>setSort(e.target.value)}><option value="next">Next payment</option><option value="name">Name A–Z</option><option value="price-desc">Price: high to low</option><option value="price-asc">Price: low to high</option><option value="annual-desc">Annual cost</option><option value="category">Category</option></select></label></div></div><div className="filters">{["Active",...cats,"Inactive"].map(c=><button key={c} className={c===filter?"active":""} onClick={()=>setFilter(c)}>{c}{filter===c?` ${c==="Active"?activeSubs.length:c==="Inactive"?subs.length-activeSubs.length:activeSubs.filter(item=>item.category===c).length}`:""}</button>)}</div><div className="rows">{shown.map(s=><article className={s.active?"row":"row inactive"} key={s.id}><div className="service"><i style={{background:s.color}}>{s.name[0]}</i><div><h3>{s.name}</h3><small>{s.category}</small></div></div><div className="date"><label>NEXT PAYMENT</label><b>{new Intl.DateTimeFormat("en-AU",{day:"numeric",month:"short"}).format(new Date(s.next+"T12:00:00"))}</b><small>{days(s.next)>=0?`in ${days(s.next)} days`:`${-days(s.next)} days overdue`}</small></div><div className="price"><b>{money(s.price)}/{cycleShort[s.cycle]}</b><small>{money(annual(s))}/yr</small></div><div className="actions"><button onClick={()=>setEdit(s)}>Edit</button></div></article>)}{ready&&!shown.length&&<div className="empty"><h3>No subscriptions found</h3><p>Try another search or add a payment.</p></div>}</div></section><aside><b>●</b><div><strong>Stored in local PostgreSQL. Your data stays yours.</strong><p>Subscription and payment records remain inside your self-hosted database.</p></div><button onClick={backup}>Export all data →</button></aside></main>{edit!==undefined&&<Modal value={edit} close={()=>setEdit(undefined)} save={save} remove={remove}/>} {note&&<div className="toast">✓ {note}</div>}</>}
function Modal({value,close,save,remove}:{value:S|null;close:()=>void;save:(s:S)=>void;remove:(s:S)=>void}){
  const localDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const today=localDate(new Date());
  const defaultDate=new Date();
  defaultDate.setDate(defaultDate.getDate()+7);
  const [color,setColor]=useState(value?.color||"");
  const [name,setName]=useState(value?.name||"");
  const [price,setPrice]=useState(value?.price.toString()||"");
  const [cycle,setCycle]=useState<S["cycle"]>(value?.cycle||"monthly");
  const [next,setNext]=useState(value?.next||localDate(defaultDate));
  const [category,setCategory]=useState(value?.category||cats[0]);
  const [dateError,setDateError]=useState("");

  const payload=(active=value?.active??true):S=>({
    id:value?.id||crypto.randomUUID(),name,price:+price,cycle,next,category,
    color:color||value?.color||colorFor(name),active,
  });
  const validDate=()=>{
    if(next>=today)return true;
    setDateError("Next payment date cannot be earlier than today.");
    return false;
  };
  const submit=(event:FormEvent)=>{
    event.preventDefault();
    if(!validDate())return;
    save(payload());
  };
  const toggleActive=()=>{
    if(!value)return;
    if(!value.active&&!validDate())return;
    save(payload(!value.active));
  };

  return <div className="shade" onMouseDown={event=>event.target===event.currentTarget&&close()}>
    <div className="modal">
      <div className="modalhead"><div><em>RECURRING PAYMENT</em><h2>{value?"Edit subscription":"Add a subscription"}</h2></div><button onClick={close}>×</button></div>
      <form onSubmit={submit}>
        <label>Service name<input autoFocus required value={name} onChange={event=>setName(event.target.value)}/></label>
        <div className="formrow">
          <label>Price (AUD)<input required type="number" min="0" step=".01" value={price} onChange={event=>setPrice(event.target.value)}/></label>
          <label>Billing cycle<select value={cycle} onChange={event=>setCycle(event.target.value as S["cycle"])}><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
        </div>
        <div className="formrow">
          <label>Next payment<input required type="date" min={today} value={next} aria-describedby="date-error" onChange={event=>{setNext(event.target.value);setDateError("")}}/>{dateError&&<small id="date-error" className="field-error">{dateError}</small>}</label>
          <label>Category<select value={category} onChange={event=>setCategory(event.target.value)}>{cats.map(item=><option key={item}>{item}</option>)}</select></label>
        </div>
        <label className="color-field">Icon colour<div className="color-options">{palette.map(item=><button type="button" key={item} aria-label={`Use icon colour ${item}`} aria-pressed={(color||colorFor(name))===item} className={(color||colorFor(name))===item?"selected":""} style={{background:item}} onClick={()=>setColor(item)}/>)}</div></label>
        <div className="modalfooter">
          {value&&<div className="lifecycle-actions"><button type="button" className="lifecycle-button" onClick={toggleActive}>{value.active?"Inactive":"Reactivate"}</button><button type="button" className="delete-subscription" onClick={()=>remove(value)}>Delete</button></div>}
          <div className="modalbuttons"><button type="button" className="ghost" onClick={close}>Cancel</button><button className="primary">Save</button></div>
        </div>
      </form>
    </div>
  </div>
}
