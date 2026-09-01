import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SHEET_ID   = "1xzDG8j2OaGztXr1avRmndtT5DxYSEnbzaZklgyxUY8k";
const ADMIN_PIN  = "1234";
const TODAY      = new Date().toLocaleDateString("en-CA");

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const SUPA_URL  = "https://gvvzxyuoifmlwzysppuz.supabase.co";
const SUPA_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dnp4eXVvaWZtbHd6eXNwcHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDI0MzEsImV4cCI6MjA5NTk3ODQzMX0.6_Hvi8YvjQomrK_b1eExyyC6jwdz9J2q-pEgN-stz14";
const supabase  = createClient(SUPA_URL, SUPA_KEY);

// ─── SUPABASE HELPERS ─────────────────────────────────────────────────────────
// Generic fetch-all from a table
async function dbFetch(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) { console.error("dbFetch", table, error); return null; }
  return data;
}
// Upsert (insert or update by id)
async function dbUpsert(table, rows) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) console.error("dbUpsert", table, error);
}
// Delete by id
async function dbDelete(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error("dbDelete", table, error);
}
// Insert (for logs / checkins that have no natural id conflict)
async function dbInsert(table, rows) {
  if (!rows || rows.length === 0) return;
  const { error } = await supabase.from(table).insert(rows);
  if (error) {
    console.error("dbInsert error:", table, error.message, error.details);
    throw error; // re-throw so callers can catch
  }
}

// ─── EXERCISE LIBRARY ─────────────────────────────────────────────────────────
const DEFAULT_LIBRARY = [
  { id:"ex1",  name:"Back Squat",                       category:"Lower Body",    unit:"lb" },
  { id:"ex2",  name:"Romanian Deadlift",                category:"Lower Body",    unit:"lb" },
  { id:"ex3",  name:"Bulgarian Split Squat",            category:"Lower Body",    unit:"lb" },
  { id:"ex4",  name:"Leg Press",                        category:"Lower Body",    unit:"lb" },
  { id:"ex5",  name:"Trap Bar Deadlift",                category:"Lower Body",    unit:"lb" },
  { id:"ex6",  name:"Low Pin Squat (Above Parallel)",   category:"Lower Body",    unit:"lb" },
  { id:"ex7",  name:"DB Isometric Lunge Hold",          category:"Lower Body",    unit:"sec" },
  { id:"ex8",  name:"Kneeling Starts",                  category:"Speed/Agility", unit:"" },
  { id:"ex9",  name:"Drop Jump",                        category:"Plyometrics",   unit:"" },
  { id:"ex10", name:"Bench Press",                      category:"Upper Body",    unit:"lb" },
  { id:"ex11", name:"Incline DB Press",                 category:"Upper Body",    unit:"lb" },
  { id:"ex12", name:"Overhead Press",                   category:"Upper Body",    unit:"lb" },
  { id:"ex13", name:"Barbell Sumo Rack Pull",           category:"Upper Body",    unit:"lb" },
  { id:"ex14", name:"Tricep Pushdown",                  category:"Upper Body",    unit:"lb" },
  { id:"ex15", name:"DB Row",                           category:"Upper Body",    unit:"lb" },
  { id:"ex16", name:"Pull-Up",                          category:"Upper Body",    unit:"lb" },
  { id:"ex17", name:"Dynamic Kneel to Squat",           category:"Warmup",        unit:"" },
  { id:"ex18", name:"Hinge Reach",                      category:"Warmup",        unit:"" },
  { id:"ex19", name:"Twist Skips",                      category:"Warmup",        unit:"yds" },
  { id:"ex20", name:"Kneeling Start to Side Step Lunge",category:"Warmup",        unit:"" },
  { id:"ex21", name:"Plank",                            category:"Core",          unit:"sec" },
  { id:"ex22", name:"Dead Bug",                         category:"Core",          unit:"" },
  { id:"ex23", name:"Pallof Press",                     category:"Core",          unit:"lb" },
];

const DEFAULT_ATHLETES = [
  { id:"1", name:"Marcus Johnson",  number:"3",  position:"PG" },
  { id:"2", name:"Devon Williams",  number:"11", position:"SG" },
  { id:"3", name:"Jaylen Carter",   number:"23", position:"SF" },
  { id:"4", name:"Trevon Mitchell", number:"5",  position:"PF" },
  { id:"5", name:"Elijah Davis",    number:"44", position:"C"  },
];

// Seed workouts across the current week so the calendar has something to show
const seedWeek = () => {
  const d = new Date();
  const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7));
  const iso = (dt) => dt.toLocaleDateString("en-CA");
  const day = (n) => { const x = new Date(mon); x.setDate(mon.getDate()+n); return iso(x); };
  return [
    { id:"sw1", date:day(0), title:"Lower Body Strength", type:"Strength", coachNote:"Focus on depth and control today. No ego weight.", blocks:[
      { label:"A1", exerciseId:"ex17", sets:2, reps:"10",     notes:"" },
      { label:"A2", exerciseId:"ex18", sets:2, reps:"10",     notes:"" },
      { label:"A3", exerciseId:"ex19", sets:2, reps:"10 yds", notes:"" },
      { label:"A4", exerciseId:"ex20", sets:2, reps:"6",      notes:"" },
      { label:"B",  exerciseId:"ex8",  sets:1, reps:"6",      notes:"" },
      { label:"C",  exerciseId:"ex9",  sets:3, reps:"5",      notes:"" },
      { label:"D",  exerciseId:"ex6",  sets:6, reps:"3",      notes:"Focus on depth" },
      { label:"E",  exerciseId:"ex13", sets:4, reps:"4",      notes:"" },
      { label:"F",  exerciseId:"ex7",  sets:3, reps:"35",     notes:"" },
    ]},
    { id:"sw2", date:day(2), title:"Upper Body Push", type:"Strength", coachNote:"Work up to a tough set of 3 on bench, then back off.", blocks:[
      { label:"A",  exerciseId:"ex10", sets:4, reps:"5,3,2,1", notes:"" },
      { label:"B",  exerciseId:"ex11", sets:3, reps:"10",       notes:"" },
      { label:"C",  exerciseId:"ex12", sets:3, reps:"8",        notes:"" },
      { label:"D",  exerciseId:"ex14", sets:3, reps:"12",       notes:"" },
    ]},
    { id:"sw3", date:day(4), title:"Lower Body Power", type:"Plyometrics", coachNote:"Short rest today — 60 sec max between sets.", blocks:[
      { label:"A",  exerciseId:"ex1",  sets:5, reps:"5,2,2,1,1", notes:"" },
      { label:"B",  exerciseId:"ex2",  sets:3, reps:"8",          notes:"" },
      { label:"C",  exerciseId:"ex9",  sets:4, reps:"5",          notes:"Stick the landing" },
      { label:"D",  exerciseId:"ex21", sets:3, reps:"45",         notes:"" },
    ]},
  ];
};

const DEFAULT_SCHEDULED = seedWeek();

const DEFAULT_LOGS = [
  { athleteId:"1", workoutId:"sw1", date:"2026-05-25", exerciseName:"Back Squat",            set:1, weight:225, reps:5 },
  { athleteId:"1", workoutId:"sw1", date:"2026-05-25", exerciseName:"Back Squat",            set:2, weight:225, reps:5 },
  { athleteId:"1", workoutId:"sw1", date:"2026-05-25", exerciseName:"Back Squat",            set:3, weight:235, reps:5 },
  { athleteId:"1", workoutId:"sw1", date:"2026-05-25", exerciseName:"Back Squat",            set:4, weight:235, reps:4 },
  { athleteId:"1", workoutId:"sw1", date:"2026-05-25", exerciseName:"Romanian Deadlift",     set:1, weight:185, reps:8 },
  { athleteId:"1", workoutId:"sw1", date:"2026-05-27", exerciseName:"Bench Press",           set:1, weight:185, reps:6 },
  { athleteId:"1", workoutId:"sw1", date:"2026-05-27", exerciseName:"Bench Press",           set:2, weight:195, reps:5 },
  { athleteId:"1", workoutId:"sw1", date:"2026-05-27", exerciseName:"Barbell Sumo Rack Pull",set:1, weight:185, reps:4 },
  { athleteId:"2", workoutId:"sw1", date:"2026-05-25", exerciseName:"Back Squat",            set:1, weight:185, reps:5 },
  { athleteId:"2", workoutId:"sw1", date:"2026-05-25", exerciseName:"Back Squat",            set:2, weight:195, reps:5 },
  { athleteId:"2", workoutId:"sw1", date:"2026-05-27", exerciseName:"Bench Press",           set:1, weight:155, reps:6 },
  { athleteId:"2", workoutId:"sw1", date:"2026-05-27", exerciseName:"Bench Press",           set:2, weight:165, reps:6 },
  { athleteId:"4", workoutId:"sw1", date:"2026-05-25", exerciseName:"Back Squat",            set:1, weight:275, reps:5 },
  { athleteId:"4", workoutId:"sw1", date:"2026-05-25", exerciseName:"Back Squat",            set:2, weight:285, reps:5 },
  { athleteId:"5", workoutId:"sw1", date:"2026-05-25", exerciseName:"Back Squat",            set:1, weight:315, reps:5 },
  { athleteId:"5", workoutId:"sw1", date:"2026-05-25", exerciseName:"Barbell Sumo Rack Pull",set:1, weight:295, reps:4 },
];

const DEFAULT_CHECKINS = [
  { athleteId:"1", date:"2026-05-25", time:"6:02 AM", workoutTitle:"Lower Body Strength" },
  { athleteId:"2", date:"2026-05-25", time:"6:05 AM", workoutTitle:"Lower Body Strength" },
  { athleteId:"3", date:"2026-05-27", time:"6:10 AM", workoutTitle:"Upper Body Push" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const calc1RM = (w, r) => {
  if (!w || w <= 0) return null;
  if (!r || r <= 0) return w; // no reps recorded — use weight as floor 1RM estimate
  return r === 1 ? w : Math.round(w * (1 + r / 30));
};

const getLastSession = (logs, athleteId, exerciseName) => {
  const rel = logs.filter(l=>l.athleteId===athleteId&&l.exerciseName===exerciseName)
                  .sort((a,b)=>b.date.localeCompare(a.date));
  if (!rel.length) return null;
  const lastDate = rel[0].date;
  return { date:lastDate, sets: rel.filter(l=>l.date===lastDate).sort((a,b)=>a.set-b.set) };
};

const getWorkingMax = (logs, athleteId, exerciseName) => {
  const rel = logs.filter(l=>l.athleteId===athleteId&&l.exerciseName===exerciseName&&l.weight>0);
  if (!rel.length) return null;
  // Use 1RM when reps recorded; fall back to weight logged when reps missing/0
  const vals = rel.map(l=>calc1RM(l.weight,l.reps) ?? ((!l.reps||l.reps===0) ? l.weight : null)).filter(Boolean);
  return vals.length ? Math.max(...vals) : null;
};

// Returns true if any set logged TODAY beats the all-time working max
const isNewPR = (logs, athleteId, exerciseName, sessionSetData) => {
  const historicMax = getWorkingMax(logs, athleteId, exerciseName);
  const sessionOrms = Object.values(sessionSetData || {})
    .filter(s => s.weight && s.reps)
    .map(s => calc1RM(parseFloat(s.weight), parseInt(s.reps)))
    .filter(Boolean);
  if (!sessionOrms.length) return false;
  const sessionMax = Math.max(...sessionOrms);
  // PR if session best beats historic (or no history yet and they logged something)
  return historicMax === null ? false : sessionMax > historicMax;
};

// Group consecutive blocks with same letter prefix into supersets
// e.g. A1,A2,A3 → one group; B,C → individual
// Auto-compute labels from position and groupWithNext flags
// groupWithNext=true means "chain me with the next block into a superset"
const computeLabels = (blocks) => {
  const labels = [];
  let groupLetter = 0; // 0=A, 1=B, etc.
  let i = 0;
  while (i < blocks.length) {
    const letter = String.fromCharCode(65 + groupLetter);
    if (blocks[i].groupWithNext && i + 1 < blocks.length) {
      // Start of a superset — collect all chained blocks
      let j = i;
      let num = 1;
      while (j < blocks.length && (j === i || blocks[j-1].groupWithNext)) {
        labels.push(`${letter}${num}`);
        num++;
        j++;
      }
      i = j;
    } else {
      labels.push(letter);
      i++;
    }
    groupLetter++;
  }
  return labels;
};

const applyLabels = (blocks) => {
  const labels = computeLabels(blocks);
  return blocks.map((b, i) => ({ ...b, label: labels[i] || String.fromCharCode(65+i) }));
};

const groupBlocks = (blocks) => {
  // Works from computed labels OR groupWithNext flag
  const groups = [];
  let i = 0;
  while (i < blocks.length) {
    const blk = blocks[i];
    // Superset: this block OR previous had groupWithNext
    if (blk.groupWithNext && i + 1 < blocks.length) {
      const prefix = (blk.label || "A").replace(/\d+$/, "");
      const group = [{ ...blk, blockIdx: i }];
      let j = i + 1;
      while (j < blocks.length && blocks[j-1].groupWithNext) {
        group.push({ ...blocks[j], blockIdx: j });
        j++;
      }
      groups.push({ type: "superset", prefix, items: group });
      i = j;
    } else {
      // Check label-based grouping for backward compat (data from before this update)
      const label = blk.label || "";
      const prefix = label.match(/^([A-Z]+)/)?.[1] || label;
      const hasNumber = /^[A-Z]+\d+$/.test(label);
      if (hasNumber) {
        const group = [{ ...blk, blockIdx: i }];
        let j = i + 1;
        while (j < blocks.length) {
          const nl = blocks[j].label || "";
          const np = nl.match(/^([A-Z]+)/)?.[1] || nl;
          if (np === prefix && /^[A-Z]+\d+$/.test(nl)) {
            group.push({ ...blocks[j], blockIdx: j });
            j++;
          } else break;
        }
        if (group.length > 1) {
          groups.push({ type: "superset", prefix, items: group });
          i = j;
        } else {
          groups.push({ type: "single", item: { ...blk, blockIdx: i } });
          i++;
        }
      } else {
        groups.push({ type: "single", item: { ...blk, blockIdx: i } });
        i++;
      }
    }
  }
  return groups;
};

// Find the workout assigned to a specific athlete on a given date
// Priority: specific player assignment > group assignment > "all" assignment
const findAthleteWorkout = (scheduled, groups, athleteId, date) => {
  const dayWorkouts = scheduled.filter(w => w.date === date);
  if (!dayWorkouts.length) return null;

  // Check for specific player assignment first
  const playerSpecific = dayWorkouts.find(w =>
    w.assignedTo?.type === "players" &&
    (w.assignedTo?.playerIds||[]).includes(athleteId)
  );
  if (playerSpecific) return playerSpecific;

  // Check for group assignment
  const athleteGroupIds = (groups||[]).filter(g=>(g.athleteIds||[]).includes(athleteId)).map(g=>g.id);
  if (athleteGroupIds.length) {
    const groupAssigned = dayWorkouts.find(w =>
      w.assignedTo?.type === "groups" &&
      (w.assignedTo?.groupIds||[]).some(gid => athleteGroupIds.includes(gid))
    );
    if (groupAssigned) return groupAssigned;
  }

  // Fall back to "all" workout
  const allWorkout = dayWorkouts.find(w => !w.assignedTo || w.assignedTo.type === "all");
  if (allWorkout) return allWorkout;

  // No workout assigned to this athlete
  return undefined; // undefined = no assignment (vs null = no workout exists)
};

// Build a 7-day window (Mon–Sun of the displayed week)
const weekDays = (anchorDate) => {
  const d = new Date(anchorDate + "T12:00:00");
  const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7));
  return Array.from({length:7}, (_,i) => {
    const x = new Date(mon); x.setDate(mon.getDate()+i);
    return x.toLocaleDateString("en-CA");
  });
};

const fmtDate = (iso) => {
  if (!iso) return "";
  const [y,m,day] = iso.split("-");
  return new Date(+y,+m-1,+day).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
};
const dayLabel  = (iso) => { const [,, d] = iso.split("-"); return String(+d); };
const weekLabel = (iso) => { const [y,m,d] = iso.split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{weekday:"short"}); };
const monthLabel= (days) => {
  const [y,m] = days[0].split("-");
  return new Date(+y,+m-1,1).toLocaleDateString("en-US",{month:"long",year:"numeric"}).toUpperCase();
};

async function appendToSheet(values) {
  try {
    await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
        mcp_servers:[{type:"url",url:"https://drivemcp.googleapis.com/mcp/v1",name:"gdrive"}],
        messages:[{role:"user",content:`Append to Google Sheet ${SHEET_ID} Sheet1: ${JSON.stringify(values)}`}]
      })
    });
  } catch(e){console.error(e);}
}

function QRCode({size=120}){
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current; if(!c)return;
    const ctx=c.getContext("2d");
    ctx.fillStyle="#0a0f1e"; ctx.fillRect(0,0,size,size);
    const cell=size/21;
    const p=[[1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],[1,0,0,0,0,0,1,0,0,1,0,1,1,0,0,0,0,0,1],[1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,1,0,0,0,1,0,1,1,1,0,1],[1,0,0,0,0,0,1,0,0,1,1,0,1,0,0,0,0,0,1],[1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0],[1,0,1,1,0,1,1,1,0,1,1,0,1,1,0,1,0,1,1],[0,1,0,0,1,0,0,0,1,0,1,1,0,1,1,0,1,0,0],[1,1,1,0,1,1,1,0,0,1,0,0,1,0,1,1,0,1,1],[0,0,0,0,0,0,0,0,1,1,0,1,0,0,1,0,1,0,1],[1,1,1,1,1,1,1,0,0,0,1,0,1,0,0,1,0,1,0],[1,0,0,0,0,0,1,0,1,0,0,1,0,1,1,0,1,0,1],[1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,1,0,0,1],[1,0,1,1,1,0,1,0,1,0,1,1,0,1,1,0,1,1,0],[1,0,1,1,1,0,1,0,0,1,0,0,1,0,1,0,0,1,1],[1,0,0,0,0,0,1,0,1,1,1,0,0,1,0,1,0,0,1],[1,1,1,1,1,1,1,0,0,0,1,1,1,0,1,0,1,0,0]];
    ctx.fillStyle="#e8b84b";
    p.forEach((row,r)=>row.forEach((b,c)=>{ if(b) ctx.fillRect(c*cell+cell,r*cell+cell,cell-.5,cell-.5); }));
  },[size]);
  return <canvas ref={ref} width={size} height={size} style={{borderRadius:8}}/>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════════════════════
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --navy:#0a0f1e;--navy-mid:#111827;--navy-light:#1a2640;
    --gold:#e8b84b;--gold-dim:#b8872a;--gold-glow:rgba(232,184,75,.12);
    --white:#f0f4ff;--gray:#8a9ab5;--success:#2ecc71;--danger:#e74c3c;
    --border:rgba(232,184,75,.18);--bs:rgba(255,255,255,.06);
  }
  body{font-family:'Barlow',sans-serif;background:var(--navy);color:var(--white);}
  .app{min-height:100vh;}

  /* LANDING */
  .landing{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;
    background:radial-gradient(ellipse at 30% 20%,rgba(232,184,75,.08) 0%,transparent 60%),
               radial-gradient(ellipse at 80% 80%,rgba(232,184,75,.05) 0%,transparent 50%),var(--navy);}
  .logo-block{text-align:center;margin-bottom:2.5rem;}
  .logo-letters{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:5rem;color:var(--gold);
    letter-spacing:-2px;text-shadow:0 0 40px rgba(232,184,75,.4);line-height:1;}
  .logo-sub{font-family:'Barlow Condensed',sans-serif;font-size:1rem;letter-spacing:.4em;color:var(--gray);text-transform:uppercase;margin-top:.25rem;}
  .landing-cards{display:flex;flex-direction:column;gap:1rem;width:100%;max-width:480px;}
  .mode-card-primary{background:var(--navy-light);border:1px solid var(--border);
    border-radius:16px;padding:1.5rem 1.75rem;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;
    display:flex;align-items:center;gap:1.25rem;}
  .mode-card-primary:hover{border-color:var(--gold);box-shadow:0 8px 30px rgba(0,0,0,.3);}
  .mode-card-secondary{background:transparent;border:1px solid var(--border);
    border-radius:12px;padding:.875rem 1.25rem;cursor:pointer;transition:all .2s;
    display:flex;align-items:center;gap:.875rem;}
  .mode-card-secondary:hover{border-color:var(--gold);}
  .mode-icon{font-size:2.5rem;margin-bottom:1rem;}
  .mode-title{font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:700;color:var(--gold);letter-spacing:.05em;}
  .mode-desc{font-size:.85rem;color:var(--gray);margin-top:.5rem;line-height:1.5;}

  /* SHARED */
  .screen{min-height:100vh;display:flex;flex-direction:column;}
  .topbar{background:var(--navy-mid);border-bottom:1px solid var(--border);padding:1rem 1.5rem;
    display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
  .topbar-brand{display:flex;align-items:center;gap:.75rem;}
  .topbar-logo{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.5rem;color:var(--gold);}
  .topbar-title{font-size:.8rem;color:var(--gray);letter-spacing:.1em;text-transform:uppercase;}
  .back-btn{background:transparent;border:1px solid var(--border);color:var(--gray);padding:.4rem 1rem;
    border-radius:6px;cursor:pointer;font-size:.85rem;font-family:'Barlow',sans-serif;transition:all .2s;}
  .back-btn:hover{border-color:var(--gold);color:var(--gold);}
  .body-pad{flex:1;padding:1.5rem;max-width:640px;margin:0 auto;width:100%;}
  .section-title{font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:700;
    color:var(--gold);letter-spacing:.05em;margin-bottom:1.25rem;}

  /* ── WEEKLY CALENDAR STRIP ─────────────────────────────────────────── */
  .cal-wrap{background:var(--navy-mid);border-bottom:1px solid var(--border);user-select:none;}
  .cal-month-row{display:flex;align-items:center;justify-content:space-between;padding:.6rem 1.25rem .3rem;}
  .cal-month{font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;
    color:var(--white);letter-spacing:.12em;}
  .cal-nav{display:flex;gap:.25rem;}
  .cal-nav-btn{background:transparent;border:none;color:var(--gray);font-size:1.1rem;cursor:pointer;
    padding:.2rem .5rem;border-radius:4px;transition:color .15s;}
  .cal-nav-btn:hover{color:var(--gold);}
  .cal-days{display:grid;grid-template-columns:repeat(7,1fr);padding:.25rem .75rem .75rem;}
  .cal-day{display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:.4rem .2rem;
    cursor:pointer;border-radius:10px;transition:background .15s;position:relative;}
  .cal-day:hover{background:var(--gold-glow);}
  .cal-day.selected{background:var(--gold-glow);}
  .cal-day-label{font-size:.65rem;color:var(--gray);text-transform:uppercase;letter-spacing:.06em;}
  .cal-day-num{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;color:var(--gray);}
  .cal-day.selected .cal-day-num{color:var(--gold);}
  .cal-day.is-today .cal-day-num{color:var(--white);}
  .cal-day.selected.is-today .cal-day-num{color:var(--gold);}
  .cal-dot{width:5px;height:5px;border-radius:50%;background:var(--gray);opacity:.5;}
  .cal-dot.has-workout{background:var(--gold);opacity:1;}
  .cal-dot.is-today-dot{background:var(--white);opacity:.7;}
  .cal-sel-bar{height:2px;background:var(--gold);border-radius:1px;width:70%;margin-top:.1rem;opacity:0;}
  .cal-day.selected .cal-sel-bar{opacity:1;}

  /* SUCCESS FLASH */
  .success-flash{position:fixed;inset:0;background:rgba(10,15,30,.97);display:flex;flex-direction:column;
    align-items:center;justify-content:center;z-index:200;animation:fadeIn .2s ease;}
  .success-icon{font-size:5rem;margin-bottom:1rem;}
  .success-name{font-family:'Barlow Condensed',sans-serif;font-size:2.5rem;font-weight:700;color:var(--gold);}
  .success-msg{color:var(--gray);margin-top:.5rem;}
  .success-bar{width:200px;height:3px;background:var(--navy-light);border-radius:2px;margin-top:2rem;overflow:hidden;}
  .success-bar-fill{height:100%;background:var(--gold);animation:bar 2.2s linear forwards;border-radius:2px;}
  @keyframes bar{from{width:0%}to{width:100%}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}

  /* ATHLETE GRID */
  .athlete-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;width:100%;margin-bottom:1.5rem;}
  .athlete-btn{background:var(--navy-light);border:1px solid var(--border);border-radius:12px;padding:1.25rem;
    cursor:pointer;display:flex;align-items:center;gap:.75rem;transition:all .2s;font-family:'Barlow',sans-serif;width:100%;}
  .athlete-btn:hover,.athlete-btn.sel{border-color:var(--gold);background:var(--gold-glow);}
  .athlete-number{width:38px;height:38px;border-radius:50%;background:var(--gold);color:var(--navy);
    font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:.9rem;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .athlete-info{text-align:left;}
  .athlete-name{font-size:.9rem;font-weight:600;color:var(--white);}
  .athlete-pos{font-size:.75rem;color:var(--gray);}

  /* WORKOUT CARDS */
  .workout-card{background:var(--navy-light);border:1px solid var(--border);border-radius:14px;
    margin-bottom:1rem;overflow:hidden;cursor:pointer;transition:border-color .2s;}
  .workout-card:hover{border-color:var(--gold);}
  .workout-card-header{padding:1.25rem;display:flex;justify-content:space-between;align-items:center;}
  .workout-card-title{font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:700;}
  .workout-card-meta{font-size:.8rem;color:var(--gray);margin-top:.2rem;}
  .workout-badge{padding:.3rem .75rem;border-radius:6px;font-size:.75rem;font-weight:600;
    background:var(--gold-glow);border:1px solid var(--border);color:var(--gold);
    font-family:'Barlow Condensed',sans-serif;letter-spacing:.05em;white-space:nowrap;}

  /* COACH NOTE */
  .coach-note-box{background:rgba(232,184,75,.06);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;
    padding:.875rem 1rem;margin-bottom:1.25rem;}
  .coach-note-label{font-size:.65rem;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;margin-bottom:.3rem;}
  .coach-note-text{font-size:.9rem;color:var(--white);line-height:1.55;}

  /* EXERCISE ROW (athlete overview) */
  .th-exercise-row{display:flex;align-items:flex-start;gap:.875rem;background:var(--navy-light);
    border:1px solid var(--border);border-radius:12px;padding:1rem;margin-bottom:.75rem;cursor:pointer;transition:border-color .2s;}
  .th-exercise-row:hover{border-color:var(--gold);}
  .th-ex-label{width:32px;height:32px;border-radius:50%;border:2px solid var(--gold);color:var(--gold);
    font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.85rem;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .th-ex-label.done{background:var(--success);border-color:var(--success);color:#fff;}
  .th-ex-main{flex:1;min-width:0;}
  .th-ex-name{font-weight:600;font-size:1rem;color:var(--white);}
  .th-ex-spec{font-size:.8rem;color:var(--gold);margin-top:.15rem;}
  .th-ex-last{font-size:.72rem;color:var(--gray);margin-top:.25rem;}
  .th-ex-status{display:flex;align-items:center;flex-shrink:0;padding-top:.1rem;}

  /* EXERCISE DETAIL */
  .th-dots-bar{display:flex;align-items:center;justify-content:space-between;
    padding:1rem 1.25rem .5rem;background:var(--navy-mid);border-bottom:1px solid var(--border);}
  .th-collapse-btn{background:transparent;border:none;color:var(--gray);font-size:1.1rem;cursor:pointer;padding:.25rem;width:28px;}
  .th-dots{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;justify-content:center;}
  .th-dot{width:10px;height:10px;border-radius:50%;border:2px solid var(--gray);cursor:pointer;transition:all .2s;flex-shrink:0;}
  .th-dot.active{border-color:var(--gold);background:transparent;width:14px;height:14px;}
  .th-dot.complete{border-color:var(--success);background:var(--success);}
  .th-dot.partial{border-color:var(--gold);background:var(--gold-dim);}
  .th-totals{text-align:center;padding:.875rem 1rem .25rem;background:var(--navy-mid);border-bottom:1px solid var(--border);}
  .th-total-val{font-family:'Barlow Condensed',sans-serif;font-size:1.6rem;font-weight:900;color:var(--white);}
  .th-total-lbl{font-size:.75rem;color:var(--gray);font-family:'Barlow',sans-serif;font-weight:400;}
  .th-ex-header{padding:1.25rem 1.5rem .75rem;background:var(--navy-mid);}
  .th-ex-big-name{font-family:'Barlow Condensed',sans-serif;font-size:1.75rem;font-weight:800;color:var(--white);line-height:1.1;}
  .th-ex-prescribed{font-size:.85rem;color:var(--gray);margin-top:.25rem;}
  .th-history-bar{display:flex;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:rgba(255,255,255,.02);}
  .th-hist-block{flex:1;padding:.75rem 1rem;border-right:1px solid var(--border);}
  .th-hist-block:last-child{border-right:none;}
  .th-hist-label{font-size:.6rem;color:var(--gray);letter-spacing:.1em;text-transform:uppercase;margin-bottom:.2rem;}
  .th-hist-val{font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;}
  .th-sets-area{flex:1;padding:1rem 1.25rem;overflow-y:auto;background:var(--navy);}
  .th-sets-header{display:flex;align-items:center;gap:.5rem;padding:0 0 .5rem;font-size:.7rem;
    letter-spacing:.12em;color:var(--gray);text-transform:uppercase;font-weight:600;
    border-bottom:1px solid var(--border);margin-bottom:.5rem;}
  .th-set-row{display:flex;align-items:center;gap:.5rem;padding:.5rem 0;
    border-bottom:1px solid var(--bs);border-radius:6px;margin-bottom:.25rem;transition:background .15s;}
  .th-set-row.done{background:rgba(46,204,113,.06);}
  .th-set-num{width:32px;text-align:center;font-family:'Barlow Condensed',sans-serif;
    font-size:1rem;font-weight:700;color:var(--gray);flex-shrink:0;}
  .th-set-inp{flex:1;background:var(--navy-light);border:1px solid var(--border);color:var(--white);
    padding:.6rem .5rem;border-radius:8px;text-align:center;
    font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:700;outline:none;transition:border-color .2s;}
  .th-set-inp:focus{border-color:var(--gold);}
  .th-circle-btn{width:36px;height:36px;border-radius:50%;border:2px solid var(--success);background:transparent;
    color:transparent;font-size:1rem;cursor:pointer;flex-shrink:0;transition:all .2s;
    display:flex;align-items:center;justify-content:center;}
  .th-circle-btn.done{background:var(--success);color:white;border-color:var(--success);}
  .th-circle-btn.pop{animation:circlePop .3s ease-out;}
  @keyframes circlePop{0%{transform:scale(1)}40%{transform:scale(1.4)}70%{transform:scale(.9)}100%{transform:scale(1)}}
  .th-set-controls{display:flex;justify-content:center;gap:2rem;padding:.75rem 0;margin-top:.25rem;}
  .th-set-ctrl-btn{background:transparent;border:1px solid var(--border);color:var(--gray);
    padding:.4rem 1.25rem;border-radius:20px;font-family:'Barlow',sans-serif;font-size:.9rem;cursor:pointer;transition:all .2s;}
  .th-set-ctrl-btn:hover{border-color:var(--gold);color:var(--gold);}
  .th-note-input{width:100%;background:transparent;border:none;border-bottom:1px solid var(--border);
    color:var(--gray);padding:.75rem 0;font-family:'Barlow',sans-serif;font-size:.9rem;outline:none;margin-top:.5rem;}
  .th-note-input::placeholder{color:rgba(138,154,181,.5);}
  .th-bottom-nav{display:flex;align-items:center;justify-content:space-between;
    background:var(--navy-mid);border-top:1px solid var(--border);padding:.875rem 1.5rem;position:sticky;bottom:0;}
  .th-nav-btn{display:flex;align-items:center;gap:.4rem;background:transparent;border:none;color:var(--gold);
    font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;cursor:pointer;
    letter-spacing:.05em;text-transform:uppercase;padding:.5rem;}
  .th-timer-btn{background:transparent;border:1px solid var(--border);color:var(--gray);
    font-family:'Barlow',sans-serif;font-size:.85rem;padding:.5rem 1rem;border-radius:20px;cursor:pointer;transition:all .2s;}
  .th-timer-btn:hover{border-color:var(--gold);color:var(--gold);}

  /* ADMIN */
  .admin-body{flex:1;padding:1.5rem;max-width:960px;margin:0 auto;width:100%;}
  .admin-tabs{display:flex;gap:.5rem;margin-bottom:2rem;flex-wrap:wrap;}
  .admin-tab{padding:.6rem 1.25rem;border-radius:8px;border:1px solid var(--border);background:transparent;
    color:var(--gray);cursor:pointer;font-family:'Barlow',sans-serif;font-size:.9rem;font-weight:500;transition:all .2s;}
  .admin-tab.active{background:var(--gold);color:var(--navy);border-color:var(--gold);font-weight:600;}
  .admin-tab:hover:not(.active){border-color:var(--gold);color:var(--gold);}
  .data-table{width:100%;border-collapse:collapse;}
  .data-table th{text-align:left;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;
    color:var(--gray);padding:.75rem 1rem;border-bottom:1px solid var(--border);font-weight:500;}
  .data-table td{padding:.875rem 1rem;border-bottom:1px solid var(--bs);font-size:.9rem;}
  .data-table tr:hover td{background:rgba(232,184,75,.03);}
  .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:2rem;}
  .stat-card{background:var(--navy-light);border:1px solid var(--border);border-radius:12px;padding:1.25rem;text-align:center;}
  .stat-num{font-family:'Barlow Condensed',sans-serif;font-size:2.5rem;font-weight:900;color:var(--gold);}
  .stat-lbl{font-size:.75rem;color:var(--gray);text-transform:uppercase;letter-spacing:.1em;margin-top:.25rem;}
  .progress-bar-wrap{background:var(--navy);border-radius:4px;height:6px;overflow:hidden;margin-top:.5rem;}
  .progress-bar-fill{height:100%;background:var(--gold);border-radius:4px;transition:width .5s ease;}

  /* LIBRARY */
  .lib-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;}
  .lib-item{display:flex;justify-content:space-between;align-items:center;padding:.75rem 1rem;
    border-bottom:1px solid var(--bs);cursor:pointer;}
  .lib-item:last-child{border-bottom:none;}
  .lib-item-name{font-weight:500;color:var(--white);}
  .lib-item-unit{font-size:.75rem;color:var(--gold);}

  /* BUILDER */
  .builder-form{background:var(--navy-light);border:1px solid var(--border);border-radius:14px;padding:1.5rem;margin-bottom:1.5rem;}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;}
  .form-field{display:flex;flex-direction:column;gap:.4rem;margin-bottom:.75rem;}
  .form-field label{font-size:.75rem;color:var(--gray);letter-spacing:.1em;text-transform:uppercase;}
  .form-input{background:var(--navy);border:1px solid var(--border);color:var(--white);
    padding:.65rem .875rem;border-radius:8px;font-family:'Barlow',sans-serif;font-size:.9rem;outline:none;transition:border-color .2s;width:100%;}
  .form-input:focus{border-color:var(--gold);}
  .gold-btn{background:var(--gold);color:var(--navy);border:none;border-radius:8px;padding:.75rem 1.5rem;
    font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;letter-spacing:.08em;
    cursor:pointer;text-transform:uppercase;transition:all .2s;}
  .gold-btn:hover{background:#f0c85a;}
  .ghost-btn{background:transparent;border:1px dashed var(--gold-dim);color:var(--gold-dim);padding:.65rem 1rem;
    border-radius:8px;cursor:pointer;font-family:'Barlow',sans-serif;font-size:.9rem;width:100%;transition:all .2s;}
  .ghost-btn:hover{border-color:var(--gold);color:var(--gold);}
  .danger-btn{background:transparent;border:none;color:var(--danger);cursor:pointer;font-size:1.1rem;padding:.5rem;}
  .block-row{display:grid;grid-template-columns:60px 1fr 60px 80px auto;gap:.5rem;margin-bottom:.5rem;align-items:end;}

  /* PICKER */
  .picker-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:400;display:flex;align-items:flex-end;justify-content:center;}
  .picker-sheet{background:var(--navy-mid);border-radius:20px 20px 0 0;width:100%;max-width:600px;
    max-height:80vh;display:flex;flex-direction:column;position:relative;}
  .picker-header{padding:1.25rem 1.5rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;}
  .picker-title{font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:700;color:var(--white);}
  .picker-close{background:transparent;border:none;color:var(--gray);font-size:1.25rem;cursor:pointer;}
  .picker-search{padding:.75rem 1.5rem;border-bottom:1px solid var(--border);}
  .picker-search input{width:100%;background:var(--navy);border:1px solid var(--border);color:var(--white);
    padding:.6rem .875rem;border-radius:8px;font-family:'Barlow',sans-serif;font-size:.9rem;outline:none;}
  .picker-search input:focus{border-color:var(--gold);}
  .picker-list{overflow-y:auto;flex:1;}
  .picker-cat{font-size:.7rem;color:var(--gray);letter-spacing:.12em;text-transform:uppercase;padding:.75rem 1.5rem .25rem;}
  .picker-item{padding:.875rem 1.5rem;cursor:pointer;transition:background .15s;display:flex;justify-content:space-between;align-items:center;}
  .picker-item:hover{background:var(--gold-glow);}
  .picker-item-name{font-size:.95rem;color:var(--white);font-weight:500;}
  .picker-item-unit{font-size:.75rem;color:var(--gold);}

  /* PIN */
  .pin-overlay{position:fixed;inset:0;background:var(--navy);display:flex;flex-direction:column;
    align-items:center;justify-content:center;z-index:300;gap:1.5rem;}
  .pin-title{font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:700;color:var(--gold);}
  .pin-dots{display:flex;gap:.75rem;}
  .pin-dot{width:14px;height:14px;border-radius:50%;border:2px solid var(--gold);transition:background .1s;}
  .pin-dot.filled{background:var(--gold);}
  .pin-numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;max-width:240px;width:100%;}
  .pin-key{padding:1rem;border-radius:10px;border:1px solid var(--border);background:var(--navy-light);
    color:var(--white);font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:700;
    cursor:pointer;transition:all .15s;text-align:center;}
  .pin-key:hover{border-color:var(--gold);color:var(--gold);}
  .pin-error{color:var(--danger);font-size:.85rem;}

  /* REST DAY / EMPTY */
  .empty-day{display:flex;flex-direction:column;align-items:center;justify-content:center;
    flex:1;text-align:center;padding:3rem 2rem;}

  @media(max-width:500px){
    .landing-cards{max-width:100%;}
    .athlete-grid{grid-template-columns:1fr;}
    .form-row{grid-template-columns:1fr;}
    .block-row{grid-template-columns:50px 1fr 50px 70px auto;gap:.35rem;}
    .admin-tabs{gap:.4rem;}
    .admin-tab{font-size:.8rem;padding:.5rem .75rem;}
    .logo-letters{font-size:3.5rem;}
    .th-history-bar{flex-wrap:wrap;}
    .th-hist-block{min-width:50%;}
  }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// WEEKLY CALENDAR STRIP
// ═══════════════════════════════════════════════════════════════════════════════
function WeekCalendar({ selectedDate, onSelectDate, scheduled, allowFuture = true, athleteId, groups: calGroups }) {
  const [anchorDate, setAnchorDate] = useState(selectedDate || TODAY);
  const days = weekDays(anchorDate);

  const prevWeek = () => {
    const d = new Date(anchorDate + "T12:00:00");
    d.setDate(d.getDate() - 7);
    setAnchorDate(d.toLocaleDateString("en-CA"));
  };
  const nextWeek = () => {
    const d = new Date(anchorDate + "T12:00:00");
    d.setDate(d.getDate() + 7);
    setAnchorDate(d.toLocaleDateString("en-CA"));
  };
  const goToday = () => { setAnchorDate(TODAY); onSelectDate(TODAY); };

  // Cap forward navigation: athletes can see up to 2 weeks ahead
  const twoWeeksOut = new Date(TODAY + "T12:00:00");
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
  const twoWeeksOutStr = twoWeeksOut.toLocaleDateString("en-CA");
  const atMaxForward = allowFuture && anchorDate >= twoWeeksOutStr;

  return (
    <div className="cal-wrap">
      <div className="cal-month-row">
        <div style={{ display:"flex", alignItems:"center", gap:".75rem" }}>
          <span className="cal-month">{monthLabel(days)}</span>
          <button className="back-btn" style={{ fontSize:".7rem", padding:".2rem .6rem" }} onClick={goToday}>TODAY</button>
        </div>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={prevWeek}>‹</button>
          <button className="cal-nav-btn" onClick={nextWeek}
            style={atMaxForward?{opacity:.3,cursor:"default"}:{}}
            disabled={atMaxForward}>›</button>
        </div>
      </div>
      <div className="cal-days">
        {days.map(d => {
          const hasWorkout = athleteId
            ? !!findAthleteWorkout(scheduled, calGroups||[], athleteId, d)
            : scheduled.some(s => s.date === d);
          const isToday    = d === TODAY;
          const isSel      = d === selectedDate;
          const isFuture   = d > TODAY;
          const disabled   = !allowFuture && isFuture;
          return (
            <div key={d}
              className={`cal-day ${isSel?"selected":""} ${isToday?"is-today":""}`}
              onClick={() => !disabled && onSelectDate(d)}
              style={disabled ? { opacity:.35, cursor:"default" } : {}}>
              <span className="cal-day-label">{weekLabel(d)}</span>
              <span className="cal-day-num">{dayLabel(d)}</span>
              <div className={`cal-dot ${hasWorkout?"has-workout":""} ${isToday&&!hasWorkout?"is-today-dot":""}`} />
              <div className="cal-sel-bar" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY — catches render crashes and shows a friendly message
// ═══════════════════════════════════════════════════════════════════════════════
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("App error:", error, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ minHeight:"100vh", background:"#0a0f1e", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", padding:"2rem", fontFamily:"sans-serif", color:"#f0f4ff" }}>
        <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>⚠️</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:"1.75rem", fontWeight:700,
          color:"#e8b84b", marginBottom:".5rem" }}>Something went wrong</div>
        <div style={{ color:"#8a9ab5", fontSize:".9rem", marginBottom:"2rem", textAlign:"center" }}>
          {this.state.error?.message || "An unexpected error occurred"}
        </div>
        <button onClick={() => { this.setState({ hasError:false, error:null }); window.location.reload(); }}
          style={{ background:"#e8b84b", color:"#0a0f1e", border:"none", borderRadius:8,
            padding:".75rem 2rem", fontWeight:700, fontSize:"1rem", cursor:"pointer" }}>
          Reload App
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP  —  all state synced via Supabase
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [mode, setMode]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [athletes,  setAthletes]    = useState(DEFAULT_ATHLETES);
  const [library,   setLibrary]     = useState(DEFAULT_LIBRARY);
  const [scheduled, setScheduled]   = useState(DEFAULT_SCHEDULED);
  const [logs,      setLogs]        = useState(DEFAULT_LOGS);
  const [checkins,  setCheckins]    = useState(DEFAULT_CHECKINS);
  const [readiness, setReadiness]   = useState([]);
  const [adminAuthed,setAdminAuthed]= useState(false);
  const [activeSession,setActiveSession] = useState(null);
  const [dbError, setDbError]       = useState(false);
  const [thought, setThought]       = useState({ text:"", author:"" });
  const [thoughtHistory, setThoughtHistory] = useState([]); // [{text, author, date}]
  const [gameDay, setGameDay]       = useState(null); // ISO date string or null
  const [routines, setRoutines]     = useState([]); // saved warmup/core/stretch routines
  const [excused,  setExcused]      = useState([]); // {athleteId, date, reason} excused absences
  const [groups,   setGroups]       = useState([]); // [{id, name, athleteIds[]}] player groups

  // Refs always hold current state — safe to read in async callbacks
  const athletesRef  = useRef(DEFAULT_ATHLETES);
  const libraryRef   = useRef(DEFAULT_LIBRARY);
  const scheduledRef = useRef(DEFAULT_SCHEDULED);
  const logsRef      = useRef(DEFAULT_LOGS);

  // ── Load all data from Supabase on mount ───────────────────────────────────
  // Uses allSettled so one missing/broken table can never take down loading.
  useEffect(() => {
    async function loadAll() {
      const results = await Promise.allSettled([
        dbFetch("athletes"),
        dbFetch("library"),
        dbFetch("scheduled"),
        dbFetch("logs"),
        dbFetch("checkins"),
        dbFetch("settings"),
        dbFetch("readiness"),
      ]);
      const [athR, libR, schR, lgR, chkR, thR, rdyR] = results;
      const val = (r) => r.status === "fulfilled" ? r.value : null;
      const ath = val(athR), lib = val(libR), sch = val(schR), lg = val(lgR),
            chk = val(chkR), th = val(thR), rdy = val(rdyR);

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          const tables = ["athletes","library","scheduled","logs","checkins","settings","readiness"];
          console.error(`Failed to load "${tables[i]}":`, r.reason);
        }
      });

      try {
        if (ath?.length)  { const v=ath.map(r=>({...r.data,id:r.id}));  setAthletes(v);  athletesRef.current=v; }
        if (lib?.length)  { const v=lib.map(r=>({...r.data,id:r.id}));  setLibrary(v);   libraryRef.current=v; }
        if (sch?.length)  {
          const v=sch.map(r=>({
            type:"Strength", blocks:[], coachNote:"", title:"Untitled",
            ...r.data, id:r.id,
            blocks: Array.isArray(r.data?.blocks) ? r.data.blocks : [],
          }));
          setScheduled(v); scheduledRef.current=v;
        }
        if (lg?.length)   { const v=lg.map(r=>r.data).filter(Boolean);  setLogs(v);      logsRef.current=v; }
        if (chk?.length)  setCheckins(chk.map(r => r.data));
        if (rdy?.length)  setReadiness(rdy.map(r => r.data));
        const thoughtRow   = th?.find(r => r.id === "thought_of_week");
        if (thoughtRow)    setThought(thoughtRow.data);
        const historyRow   = th?.find(r => r.id === "thought_history");
        if (historyRow)    setThoughtHistory(historyRow.data || []);
        const gameDayRow   = th?.find(r => r.id === "game_day");
        if (gameDayRow)    setGameDay(gameDayRow.data || null);
        const routinesRow  = th?.find(r => r.id === "warmup_routines");
        if (routinesRow)   setRoutines(routinesRow.data || []);
        const excusedRow   = th?.find(r => r.id === "excused_absences");
        if (excusedRow)    setExcused(excusedRow.data || []);
        const groupsRow    = th?.find(r => r.id === "player_groups");
        if (groupsRow)     setGroups(groupsRow.data || []);
      } catch(e) {
        console.error("Load processing error:", e);
      }

      const coreFailed = [athR, libR, schR, lgR].some(r => r.status === "rejected");
      if (coreFailed) setDbError(true);

      setLoading(false);
    }
    loadAll();
  }, []);

  // ── Wrapped setters — update local state AND Supabase ─────────────────────
  // Refs give us current state without needing to capture inside setState

  const saveAthletes = async (updater) => {
    const current = athletesRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;
    athletesRef.current = next;
    setAthletes(next);
    try { await dbUpsert("athletes", next.map(a => ({ id: a.id, data: a }))); }
    catch(e) { console.error("saveAthletes:", e); }
  };

  const saveLibrary = async (updater) => {
    const current = libraryRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;
    libraryRef.current = next;
    setLibrary(next);
    try { await dbUpsert("library", next.map(e => ({ id: e.id, data: e }))); }
    catch(e) { console.error("saveLibrary:", e); }
  };

  const saveScheduled = async (updater) => {
    const current = scheduledRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;
    scheduledRef.current = next;
    setScheduled(next);
    try {
      const nextIds = new Set(next.map(w => w.id));
      const deletions = current.filter(w => !nextIds.has(w.id));
      await Promise.all(deletions.map(w => dbDelete("scheduled", w.id)));
      await dbUpsert("scheduled", next.map(w => ({ id: w.id, data: w })));
    } catch(e) { console.error("saveScheduled:", e); }
  };

  const saveLogs = (updater) => {
    const current = logsRef.current;
    const next = typeof updater === "function" ? updater(current) : updater;
    const newRows = next.length > current.length ? next.slice(current.length) : [];
    logsRef.current = next;
    setLogs(next);
    if (newRows.length) {
      dbInsert("logs", newRows.map(l => ({ data: l })))
        .catch(e => console.error("Failed to save logs:", e));
    }
  };

  const saveCheckins = (updater) => {
    setCheckins(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const newRows = next.slice(prev.length);
      if (newRows.length) dbInsert("checkins", newRows.map(c => ({ data: c })));
      return next;
    });
  };

  const saveReadiness = (entry) => {
    setReadiness(prev => {
      const next = [...prev, entry];
      dbInsert("readiness", [{ data: entry }]).catch(e => console.error("saveReadiness:", e));
      return next;
    });
  };

  const saveThought = (t, archiveOld=false) => {
    if (archiveOld && thought?.text?.trim()) {
      const entry = { ...thought, date: TODAY };
      const updated = [entry, ...thoughtHistory].slice(0, 20); // keep last 20
      setThoughtHistory(updated);
      dbUpsert("settings", [{ id: "thought_history", data: updated }]);
    }
    setThought(t);
    dbUpsert("settings", [{ id: "thought_of_week", data: t }]);
  };

  const saveGameDay = (date) => {
    setGameDay(date);
    dbUpsert("settings", [{ id: "game_day", data: date }]);
  };

  const saveRoutines = (updated) => {
    setRoutines(updated);
    dbUpsert("settings", [{ id: "warmup_routines", data: updated }]);
  };

  const saveExcused = (updated) => {
    setExcused(updated);
    dbUpsert("settings", [{ id: "excused_absences", data: updated }]);
  };

  const saveGroups = (updated) => {
    setGroups(updated);
    dbUpsert("settings", [{ id: "player_groups", data: updated }]);
  };

  // ── Seed defaults into DB on very first run (empty DB) ────────────────────
  useEffect(() => {
    if (loading) return;
    async function seedIfEmpty() {
      const ath = await dbFetch("athletes");
      if (ath && ath.length === 0) {
        await dbUpsert("athletes",  DEFAULT_ATHLETES.map(a  => ({ id: a.id,  data: a  })));
        await dbUpsert("library",   DEFAULT_LIBRARY.map(e   => ({ id: e.id,  data: e  })));
        await dbUpsert("scheduled", DEFAULT_SCHEDULED.map(w => ({ id: w.id,  data: w  })));
      }
    }
    seedIfEmpty();
  }, [loading]);

  const sessionWorkout = activeSession
    ? scheduled.find(s => s.id === activeSession.workoutId && s.date === activeSession.date)
    : null;
  const session = (activeSession && sessionWorkout) ? activeSession : null;
  const todayWorkout = scheduled.find(s => s.date === TODAY) || null;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"var(--navy)", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:"1.5rem" }}>
      <style>{css}</style>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:"5rem", fontWeight:900,
        color:"var(--gold)", textShadow:"0 0 40px rgba(232,184,75,.4)" }}>DU</div>
      <div style={{ color:"var(--gray)", fontSize:".9rem", letterSpacing:".1em", textTransform:"uppercase" }}>
        {dbError ? "Connection error — check your network" : "Loading…"}
      </div>
      {!dbError && (
        <div style={{ width:120, height:3, background:"var(--navy-light)", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", background:"var(--gold)", borderRadius:2,
            animation:"bar 1.5s ease-in-out infinite alternate" }}/>
        </div>
      )}
    </div>
  );

  return (
    <ErrorBoundary>
    <div className="app">
      <style>{css}</style>
      {mode===null && <Landing onSelect={setMode} todayWorkout={todayWorkout}
          hasSession={!!session} sessionAthleteName={session ? athletes.find(a=>a.id===session.athleteId)?.name : null}
          thought={thought} athletes={athletes} logs={logs} checkins={checkins}
          gameDay={gameDay} />}
      {mode==="checkin" && <CheckInScreen athletes={athletes} scheduled={scheduled}
          checkins={checkins} setCheckins={saveCheckins} onBack={()=>setMode(null)} />}
      {mode==="athlete" && <AthleteScreen athletes={athletes} scheduled={scheduled}
          library={library} logs={logs} setLogs={saveLogs}
          checkins={checkins} setCheckins={saveCheckins}
          readiness={readiness} saveReadiness={saveReadiness}
          groups={groups}
          activeSession={session} setActiveSession={setActiveSession} onBack={()=>setMode(null)} />}
      {mode==="admin" && (adminAuthed
        ? <AdminScreen athletes={athletes} setAthletes={saveAthletes}
            library={library} setLibrary={saveLibrary}
            scheduled={scheduled} setScheduled={saveScheduled}
            logs={logs} checkins={checkins} thought={thought} saveThought={saveThought}
            thoughtHistory={thoughtHistory}
            readiness={readiness} routines={routines} saveRoutines={saveRoutines}
            groups={groups} saveGroups={saveGroups}
            gameDay={gameDay} saveGameDay={saveGameDay}
            onBack={()=>{setMode(null);setAdminAuthed(false);}} />
        : <PinScreen onSuccess={()=>setAdminAuthed(true)} onBack={()=>setMode(null)} />
      )}
    </div>
    </ErrorBoundary>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING
// ═══════════════════════════════════════════════════════════════════════════════
function Landing({ onSelect, todayWorkout, hasSession, sessionAthleteName, thought, athletes, logs, checkins, gameDay }) {
  return (
    <div className="landing">
      <div className="logo-block">
        <div className="logo-letters">DU</div>
        <div className="logo-sub">Dominican University Basketball</div>
      </div>
      {/* Game Day Banner on home screen */}
      {gameDay === TODAY && (
        <div style={{maxWidth:480,width:"100%",margin:"0 auto 1rem",
          background:"rgba(232,184,75,.1)",border:"2px solid var(--gold)",
          borderRadius:14,padding:"1rem 1.5rem",textAlign:"center"}}>
          <div style={{fontSize:"2rem",marginBottom:".4rem"}}>🏀</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
            fontSize:"1.75rem",color:"var(--gold)",letterSpacing:".08em"}}>GAME DAY</div>
          <div style={{fontSize:".85rem",color:"var(--gray)",marginTop:".3rem"}}>
            Focus on recovery, stay sharp, compete tonight.
          </div>
        </div>
      )}

      {thought?.text && (
        <div style={{maxWidth:480,width:"100%",margin:"0 auto 1.75rem",
          background:"rgba(232,184,75,.07)",border:"1px solid var(--border)",
          borderLeft:"3px solid var(--gold)",borderRadius:"0 12px 12px 0",
          padding:"1rem 1.25rem",textAlign:"left"}}>
          <div style={{fontSize:".65rem",color:"var(--gold)",letterSpacing:".14em",
            textTransform:"uppercase",marginBottom:".5rem",fontWeight:600}}>
            💬 Thought of the Week
          </div>
          <div style={{fontSize:"1rem",color:"var(--white)",lineHeight:1.55,fontStyle:"italic"}}>
            "{thought.text}"
          </div>
          {thought.author && (
            <div style={{fontSize:".8rem",color:"var(--gray)",marginTop:".5rem"}}>
              — {thought.author}
            </div>
          )}
        </div>
      )}
      {todayWorkout && (
        <div style={{marginBottom:"1.5rem",textAlign:"center"}}>
          <div style={{fontSize:".75rem",color:"var(--gray)",letterSpacing:".12em",textTransform:"uppercase"}}>Today</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.75rem",fontWeight:700,color:"var(--gold)",marginTop:".2rem"}}>{todayWorkout.title}</div>
          <div style={{fontSize:".8rem",color:"var(--gray)"}}>{(todayWorkout.blocks||[]).length} exercises</div>
        </div>
      )}
      {athletes && logs && <TeamPRFeed athletes={athletes} logs={logs} />}
      <div className="landing-cards">
        <div className="mode-card-primary" onClick={()=>onSelect("athlete")}
          style={hasSession?{borderColor:"var(--gold)",boxShadow:"0 0 24px rgba(232,184,75,.2)"}:{}}>
          <div style={{fontSize:"2.25rem",flexShrink:0}}>💪</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.5rem",
              fontWeight:800,color:"var(--gold)",letterSpacing:".04em",lineHeight:1.1}}>
              {hasSession ? "Resume Workout" : "My Workout"}
            </div>
            <div style={{fontSize:".85rem",color:hasSession?"var(--gold)":"var(--gray)",marginTop:".2rem"}}>
              {hasSession
                ? `▶ ${sessionAthleteName?.split(" ")[0]}'s session in progress`
                : "Log sets, reps & weights."}
            </div>
          </div>
          <div style={{color:"var(--gold)",fontSize:"1.25rem",flexShrink:0,opacity:.6}}>›</div>
        </div>
        <div className="mode-card-secondary" onClick={()=>onSelect("admin")}>
          <div style={{fontSize:"1.25rem",flexShrink:0}}>🛡️</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",
              fontWeight:700,color:"var(--gray)",letterSpacing:".04em"}}>
              Coach Dashboard
            </div>
          </div>
          <div style={{color:"var(--gray)",fontSize:"1rem",flexShrink:0,opacity:.5}}>›</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK-IN  (with calendar — can only check in today or past)
// ═══════════════════════════════════════════════════════════════════════════════
function CheckInScreen({ athletes, scheduled, checkins, setCheckins, onBack }) {
  const [sel, setSel]     = useState(null);
  const [success, setSuccess] = useState(null);
  const [showQR, setShowQR]   = useState(false);
  const [selDate, setSelDate] = useState(TODAY);

  const dayWorkout = (athlete ? findAthleteWorkout(scheduled, groups, athlete.id, selDate) : scheduled.find(s=>s.date===selDate)) || null;
  const dayCheckins = checkins.filter(c => c.date === selDate);

  const doCheckIn = () => {
    if (!sel || selDate !== TODAY) return;
    const a = athletes.find(x => x.id === sel);
    const now = new Date();
    const entry = { athleteId:a.id, date:TODAY,
      time:now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),
      workoutTitle: dayWorkout?.title || "Open Workout" };
    setCheckins(prev=>[...prev,entry]);
    appendToSheet([[a.name,entry.date,entry.time,entry.workoutTitle]]);
    setSuccess(a.name); setSel(null);
    setTimeout(()=>setSuccess(null),2500);
  };

  if (success) return (
    <div className="success-flash">
      <div className="success-icon">✅</div>
      <div className="success-name">{success}</div>
      <div className="success-msg">Checked in — let's get to work.</div>
      <div className="success-bar"><div className="success-bar-fill"/></div>
    </div>
  );

  return (
    <div className="screen">
      <div className="topbar">
        <div className="topbar-brand"><div className="topbar-logo">DU</div><div className="topbar-title">Check-In</div></div>
        <div style={{display:"flex",gap:".5rem"}}>
          <button className="back-btn" onClick={()=>setShowQR(v=>!v)}>{showQR?"Hide QR":"📱 QR"}</button>
          <button className="back-btn" onClick={onBack}>← Back</button>
        </div>
      </div>

      <WeekCalendar selectedDate={selDate} onSelectDate={setSelDate} scheduled={scheduled} allowFuture={true}
        athleteId={athlete?.id} groups={groups}/>

      <div className="body-pad">
        {showQR && (
          <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:16,
            padding:"1.5rem",textAlign:"center",marginBottom:"1.5rem"}}>
            <div style={{fontSize:".75rem",color:"var(--gold)",letterSpacing:".15em",textTransform:"uppercase",marginBottom:"1rem"}}>Scan to Check In</div>
            <QRCode size={150}/>
            <div style={{fontSize:".75rem",color:"var(--gold)",marginTop:".75rem"}}>du-basketball.app/checkin</div>
          </div>
        )}

        {dayWorkout ? (
          <div style={{background:"rgba(232,184,75,.07)",border:"1px solid var(--gold)",borderRadius:12,
            padding:"1rem 1.25rem",marginBottom:"1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:".7rem",color:"var(--gold)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".2rem"}}>
                {selDate === TODAY ? "Today's Workout" : fmtDate(selDate)}
              </div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.25rem",fontWeight:700}}>{dayWorkout.title}</div>
              <div style={{fontSize:".8rem",color:"var(--gray)",marginTop:".1rem"}}>{(dayWorkout.blocks||[]).length} exercises</div>
            </div>
            <div style={{display:"flex",gap:".5rem",alignItems:"center",flexWrap:"wrap"}}>
              {dayWorkout.phase && (
                <span style={{fontSize:".7rem",background:"rgba(139,92,246,.15)",color:"#a78bfa",
                  border:"1px solid rgba(139,92,246,.3)",borderRadius:5,padding:".15rem .5rem",
                  fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,letterSpacing:".04em"}}>
                  {dayWorkout.phase}
                </span>
              )}
              <div className="workout-badge">{dayWorkout.type||"Strength"}</div>
            </div>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"1rem",color:"var(--gray)",fontSize:".9rem",marginBottom:"1rem"}}>
            No workout scheduled for {selDate===TODAY?"today":fmtDate(selDate)}
          </div>
        )}

        {selDate === TODAY && (
          <>
            <div style={{textAlign:"center",marginBottom:"1.25rem"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.5rem",fontWeight:700,marginBottom:".4rem"}}>Select Your Name</div>
            </div>
            <div className="athlete-grid">
              {athletes.map(a=>(
                <button key={a.id} className={`athlete-btn ${sel===a.id?"sel":""}`}
                  onClick={()=>setSel(sel===a.id?null:a.id)}>
                  <div className="athlete-number">#{a.number}</div>
                  <div className="athlete-info"><div className="athlete-name">{a.name}</div><div className="athlete-pos">{a.position}</div></div>
                </button>
              ))}
            </div>
            <button className="gold-btn" style={{width:"100%",padding:"1rem",fontSize:"1.15rem",marginBottom:"1.5rem"}}
              disabled={!sel} onClick={doCheckIn}>✓ Check In</button>
          </>
        )}

        {dayCheckins.length > 0 && (
          <div>
            <div style={{fontSize:".75rem",color:"var(--gray)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".75rem"}}>
              {selDate===TODAY?"Today":"That Day"} ({dayCheckins.length})
            </div>
            {dayCheckins.map((c,i)=>{
              const a=athletes.find(x=>x.id===c.athleteId);
              return (
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:".6rem 0",borderBottom:"1px solid var(--bs)",fontSize:".9rem"}}>
                  <span>{a?.name}</span><span style={{color:"var(--gold)"}}>{c.time}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ATHLETE PORTAL  —  calendar at top, tap day to see that workout
// ═══════════════════════════════════════════════════════════════════════════════
function AthleteScreen({ athletes, scheduled, library, logs, setLogs, checkins, setCheckins, readiness, saveReadiness, groups, activeSession, setActiveSession, onBack }) {
  // ── ALL hooks must be declared first, before any conditional returns ────────
  const [athlete,        setAthlete]        = useState(null);
  const [selDate,        setSelDate]        = useState(TODAY);
  const [saved,          setSaved]          = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [saveError,      setSaveError]       = useState(false);
  const [sessionVolume,  setSessionVolume]  = useState(null);
  const [showMyProgress, setShowMyProgress] = useState(false);
  const [pinTarget,      setPinTarget]      = useState(null);
  const [pinEntry,       setPinEntry]       = useState("");
  const [pinError,       setPinError]       = useState(false);
  const [showReadiness,  setShowReadiness]  = useState(false);
  const [readinessVals,  setReadinessVals]  = useState({ sleep:0, soreness:0, stress:0 });
  const [readinessDone,  setReadinessDone]  = useState(false);
  const [swappedExercises, setSwappedExercises] = useState({}); // {blockIndex: exerciseId}
  const [showSwapPicker,   setShowSwapPicker]   = useState(false);
  const [autofillWeight,   setAutofillWeight]   = useState(""); // weight to autofill across sets
  const [limitation,       setLimitation]       = useState(""); // current session limitation note
  const [showLimitInput,   setShowLimitInput]   = useState(false);
  const [poppingSet,       setPoppingSet]       = useState(null); // "bi-si" key for animation
  const autoCheckinRef                      = useRef({});

  // Has this athlete already checked in their readiness today?
  // NOTE: uses the `readiness` PROP directly — never a locally-renamed variable.
  const hasCheckedReadinessToday = (athleteId) =>
    readiness.some(r => r.athleteId === athleteId && r.date === TODAY);

  // Session state proxied through App
  const setAthleteAndSession = (a) => {
    if (!a) { setActiveSession(null); return; }
    setActiveSession(prev => {
      const dayW = scheduled.find(s=>s.date===TODAY);
      if (prev && prev.athleteId===a.id && prev.workoutId===dayW?.id && prev.date===TODAY) return prev;
      return { athleteId:a.id, workoutId:dayW?.id, date:TODAY, setData:{}, extraSets:{}, notes:{}, exIdx:null };
    });
  };

  // exIdx lives in activeSession so it persists across navigation
  const exIdx    = activeSession?.exIdx ?? null;
  const setExIdx = (v) => setActiveSession(prev => ({
    ...prev, exIdx: typeof v === "function" ? v(prev?.exIdx ?? null) : v
  }));
  const setData    = activeSession?.setData   || {};
  const extraSets  = activeSession?.extraSets || {};
  const notes      = activeSession?.notes     || {};
  const setSetData = (u) => setActiveSession(prev=>({...prev,setData:typeof u==="function"?u(prev.setData):u}));
  const setExtra   = (u) => setActiveSession(prev=>({...prev,extraSets:typeof u==="function"?u(prev.extraSets):u}));
  const setNotes   = (u) => setActiveSession(prev=>({...prev,notes:typeof u==="function"?u(prev.notes):u}));

  // Single entry point used everywhere identity is confirmed —
  // PIN path, no-PIN path, and the inline numpad all call this one function.
  const proceedAfterIdentity = (a) => {
    setAthleteAndSession(a);
    setAthlete(a);
    if (!hasCheckedReadinessToday(a.id)) {
      setReadinessVals({ sleep:0, soreness:0, stress:0 });
      setReadinessDone(false);
      setShowReadiness(true);
    }
  };

  const handleAthleteSelect = (a) => {
    if (a.pin) { setPinTarget(a); setPinEntry(""); setPinError(false); }
    else { proceedAfterIdentity(a); }
  };

  const submitPin = () => {
    if (pinEntry === pinTarget.pin) {
      proceedAfterIdentity(pinTarget);
      setPinTarget(null); setPinEntry("");
    } else {
      setPinError(true); setPinEntry("");
      setTimeout(() => setPinError(false), 1000);
    }
  };

  if (pinTarget) return (
    <div className="pin-overlay">
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.25rem",color:"var(--white)",fontWeight:700}}>
        {pinTarget.name}
      </div>
      <div className="pin-title" style={{fontSize:"1.5rem"}}>Enter Your PIN</div>
      <div className="pin-dots">
        {[0,1,2,3].map(i=><div key={i} className={`pin-dot ${pinEntry.length>i?"filled":""}`}
          style={pinError?{borderColor:"var(--danger)",background:pinEntry.length>i?"var(--danger)":""}:{}}/>)}
      </div>
      {pinError && <div className="pin-error">Incorrect PIN — try again</div>}
      <div className="pin-numpad">
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
          <button key={i} className="pin-key" style={k===""?{visibility:"hidden"}:{}}
            onClick={()=>{
              if(k==="⌫"){ setPinEntry(p=>p.slice(0,-1)); return; }
              const next=pinEntry+String(k);
              setPinEntry(next);
              if(next.length===4) setTimeout(()=>{ 
                if(next===pinTarget.pin){ proceedAfterIdentity(pinTarget); setPinTarget(null); setPinEntry(""); }
                else { setPinError(true); setPinEntry(""); setTimeout(()=>setPinError(false),1000); }
              },150);
            }}>{k}</button>
        ))}
      </div>
      <button className="back-btn" onClick={()=>setPinTarget(null)}>← Back</button>
    </div>
  );

  // ── Readiness check-in — quick, optional, shown once per day ────────────────
  if (showReadiness && athlete) {
    const submitReadiness = () => {
      saveReadiness({
        athleteId: athlete.id, date: TODAY,
        sleep: readinessVals.sleep, soreness: readinessVals.soreness, stress: readinessVals.stress,
        timestamp: new Date().toISOString(),
      });
      setReadinessDone(true);
      setTimeout(() => setShowReadiness(false), 1100);
    };
    const skipReadiness = () => setShowReadiness(false);

    const ScaleRow = ({ label, field, lowLabel, highLabel }) => (
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ fontSize: ".95rem", fontWeight: 600, marginBottom: ".75rem" }}>{label}</div>
        <div style={{ display: "flex", gap: ".5rem", justifyContent: "space-between" }}>
          {[1,2,3,4,5].map(n => {
            const selected = readinessVals[field] === n;
            return (
              <button key={n}
                onClick={() => setReadinessVals(v => ({ ...v, [field]: n }))}
                style={{
                  flex: 1, aspectRatio: "1", borderRadius: 10, cursor: "pointer",
                  border: selected ? "2px solid var(--gold)" : "1px solid var(--border)",
                  background: selected ? "var(--gold-glow)" : "var(--navy-light)",
                  color: selected ? "var(--gold)" : "var(--gray)",
                  fontFamily: "'Barlow Condensed',sans-serif", fontSize: "1.3rem", fontWeight: 700,
                  transition: "all .15s",
                }}>
                {n}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: ".4rem" }}>
          <span style={{ fontSize: ".7rem", color: "var(--gray)" }}>{lowLabel}</span>
          <span style={{ fontSize: ".7rem", color: "var(--gray)" }}>{highLabel}</span>
        </div>
      </div>
    );

    if (readinessDone) return (
      <div className="success-flash">
        <div className="success-icon">✓</div>
        <div className="success-name">Logged</div>
        <div className="success-msg">Thanks, {athlete.name.split(" ")[0]} — let's work.</div>
        <div className="success-bar"><div className="success-bar-fill"/></div>
      </div>
    );

    const allAnswered = readinessVals.sleep && readinessVals.soreness && readinessVals.stress;

    return (
      <div className="screen">
        <div className="topbar">
          <div className="topbar-brand"><div className="topbar-logo">DU</div><div className="topbar-title">Quick Check-In</div></div>
          <button className="back-btn" onClick={skipReadiness}>Skip</button>
        </div>
        <div className="body-pad" style={{ maxWidth: 480 }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "1.75rem", fontWeight: 700, color: "var(--white)" }}>
              How are you feeling today, {athlete.name.split(" ")[0]}?
            </div>
            <div style={{ fontSize: ".85rem", color: "var(--gray)", marginTop: ".4rem" }}>
              10 seconds — helps us coach you better. Totally optional.
            </div>
          </div>

          <ScaleRow label="😴 Sleep Quality" field="sleep" lowLabel="Rough night" highLabel="Slept great" />
          <ScaleRow label="💪 Muscle Soreness" field="soreness" lowLabel="Fresh" highLabel="Very sore" />
          <ScaleRow label="🧠 Stress Level" field="stress" lowLabel="Relaxed" highLabel="High stress" />

          <button className="gold-btn" style={{ width: "100%", padding: "1rem", fontSize: "1.1rem", marginTop: ".5rem" }}
            disabled={!allAnswered} onClick={submitReadiness}>
            {allAnswered ? "Submit & Continue →" : "Tap a number for each"}
          </button>
          <button className="back-btn" style={{ width: "100%", marginTop: ".75rem", textAlign: "center" }} onClick={skipReadiness}>
            Skip for today
          </button>
        </div>
      </div>
    );
  }

  if (!athlete) return (
    <div className="screen">
      <div className="topbar">
        <div className="topbar-brand"><div className="topbar-logo">DU</div><div className="topbar-title">Athlete Portal</div></div>
        <button className="back-btn" onClick={onBack}>← Back</button>
      </div>
      <div className="body-pad">
        {activeSession && (
          <div style={{background:"rgba(232,184,75,.1)",border:"1px solid var(--gold)",borderRadius:12,
            padding:"1rem 1.25rem",marginBottom:"1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:".7rem",color:"var(--gold)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".2rem"}}>Session In Progress</div>
              <div style={{fontWeight:600,fontSize:".95rem"}}>{athletes.find(a=>a.id===activeSession.athleteId)?.name}</div>
              <div style={{fontSize:".75rem",color:"var(--gray)",marginTop:".15rem"}}>Tap your name to resume</div>
            </div>
            <div style={{fontSize:"1.75rem"}}>▶</div>
          </div>
        )}
        <div className="section-title">Who are you?</div>
        {athletes.map(a=>{
          const isActive = activeSession?.athleteId===a.id;
          return (
            <button key={a.id} className="athlete-btn" style={{marginBottom:".75rem",
              ...(isActive?{borderColor:"var(--gold)",background:"var(--gold-glow)"}:{})}}
              onClick={()=>handleAthleteSelect(a)}>
              <div className="athlete-number">#{a.number}</div>
              <div className="athlete-info">
                <div className="athlete-name">{a.name}</div>
                <div className="athlete-pos" style={{color:isActive?"var(--gold)":undefined}}>
                  {isActive?"▶ Resume session":a.position}{a.pin?" 🔒":""}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Find workout assigned to THIS athlete — undefined means no assignment, null means no workout at all
  const assignedWorkout = athlete ? findAthleteWorkout(scheduled, groups, athlete.id, selDate) : null;
  const hasWorkoutsToday = scheduled.some(s=>s.date===selDate);
  const dayWorkout = assignedWorkout === undefined
    ? null  // no assignment exists for this athlete
    : (assignedWorkout || null);
  const noAssignment = athlete && hasWorkoutsToday && assignedWorkout === undefined;
  const isToday    = selDate === TODAY;
  const isPast     = selDate < TODAY;
  const isFuture   = selDate > TODAY;
  // Safety: if athlete became null (e.g. session cleared), go back to select
  if (!athlete && exIdx !== null) { setExIdx(null); }

  // Helper
  const resolveEx    = (blk) => blk ? library.find(e=>e.id===blk.exerciseId) || null : null;
  const totalSetCount= (bi)  => (dayWorkout?.blocks[bi]?.sets||0) + (extraSets[bi]||0);
  const updateSet    = (bi,si,field,val) => setSetData(prev=>({...prev,[bi]:{...prev[bi],[si]:{...(prev[bi]?.[si]||{}),[field]:val}}}));
  const toggleDone   = (bi,si) => {
    const cur=setData[bi]?.[si]||{};
    updateSet(bi,si,"done",!cur.done);
    if(!cur.done){ // only animate on completion, not un-completion
      setPoppingSet(`${bi}-${si}`);
      setTimeout(()=>setPoppingSet(null), 350);
    }
  };
  const blockDoneCount=(bi)  => Object.values(setData[bi]||{}).filter(s=>s.done).length;

  const saveWorkout = async () => {
    if (!dayWorkout || saving) return;
    setSaving(true);

    // Capture setData NOW before session is cleared
    // Use activeSession directly — it holds the most current state
    const capturedSetData = activeSession?.setData || {};
    const newLogs=[];

    console.log("[saveWorkout] athlete:", athlete?.name,
      "| dayWorkout:", dayWorkout?.id,
      "| sessionWorkoutId:", activeSession?.workoutId,
      "| setData keys:", Object.keys(capturedSetData),
      "| blocks:", (dayWorkout.blocks||[]).length
    );
    // Log raw setData so we can see what values are actually captured
    Object.entries(capturedSetData).forEach(([bi, sets]) => {
      Object.entries(sets).forEach(([si, s]) => {
        console.log(`  block ${bi} set ${si}:`, JSON.stringify(s));
      });
    });

    (dayWorkout.blocks||[]).forEach((blk,bi)=>{
      const ex=resolveEx(blk); if(!ex) return;
      const d=capturedSetData[bi]||{};
      Object.entries(d).forEach(([si,s])=>{
        const hasWeight = parseFloat(s.weight) > 0;
        const hasReps   = parseInt(s.reps) > 0;
        const hasTime   = parseInt(s.time) > 0;
        if(hasWeight || hasReps || hasTime) newLogs.push({
          athleteId:athlete.id, workoutId:dayWorkout.id, date:TODAY,
          exerciseName:ex.name, set:parseInt(si)+1,
          weight:parseFloat(s.weight)||0, reps:parseInt(s.reps)||0,
          ...(limitation ? { limitation } : {}),
        });
      });
    });

    console.log("[saveWorkout] newLogs count:", newLogs.length);

    if (newLogs.length === 0) {
      // Nothing logged — still show saved and clear
      setSaving(false);
      setSaved(true);
      setTimeout(()=>{ setSaved(false); setActiveSession(null); setAthlete(null); },2500);
      return;
    }

    // Write directly to Supabase then update state
    try {
      console.log("[saveWorkout] inserting to Supabase...");
      const { data: insertedData, error } = await supabase
        .from("logs")
        .insert(newLogs.map(l => ({ data: l })))
        .select();
      console.log("[saveWorkout] Supabase response — error:", error, "| inserted:", insertedData?.length);
      if (error) throw error;
      setLogs(prev=>[...prev,...newLogs]);
      // Calculate total volume load for this session: sum of (weight × reps)
      const volume = newLogs.reduce((sum,l)=> sum + (l.weight * l.reps), 0);
      setSessionVolume(Math.round(volume));
      setSaving(false);
      setSaved(true);
      setTimeout(()=>{ setSaved(false); setSessionVolume(null); setActiveSession(null); setAthlete(null); },3200);
    } catch(e) {
      console.error("[saveWorkout] Save failed:", e.message || e, e);
      setSaving(false);
      setSaveError(true);
      setTimeout(()=>setSaveError(false), 4000);
    }
  };

  // Auto-log attendance the first time a player opens today's workout
  const autoCheckin = (athleteId, workout) => {
    if (!workout || !athleteId) return;
    const key = `${athleteId}-${workout.date}`;
    if (autoCheckinRef.current[key]) return; // already done this session
    autoCheckinRef.current[key] = true;
    // Only log if not already checked in today
    setCheckins(prev => {
      const already = prev.some(c => c.athleteId===athleteId && c.date===TODAY);
      if (already) return prev;
      const now = new Date();
      return [...prev, {
        athleteId, date: TODAY,
        time: now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),
        workoutTitle: workout.title
      }];
    });
  };

  // ── Exercise detail view ──
  if (exIdx !== null && dayWorkout) {
    const blk = dayWorkout.blocks[exIdx];
    // Use swapped exercise if athlete chose one for this block
    const effectiveExId = swappedExercises[exIdx] || blk?.exerciseId;
    const ex  = library.find(e => e.id === effectiveExId) || resolveEx(blk);
    const isSwapped = !!swappedExercises[exIdx];
    // Guard: if exercise not found in library, go back to overview
    if (!ex) { setExIdx(null); }
    if (!blk || !ex) return null;
    const last = getLastSession(logs,athlete.id,ex.name);
    const loggedMax = getWorkingMax(logs,athlete.id,ex.name);
    // Manual 1RM: stored in notes as "manual_1rm_ExerciseName"
    const manualKey = `manual_1rm_${ex.name}`;
    const manualMax = notes[manualKey] ? parseInt(notes[manualKey]) : null;
    // Use logged max if available (it updates automatically), fall back to manual
    const wMax = loggedMax || manualMax || null;
    const isTimeBased = ex.unit==="sec";
    const isWeighted  = ex.unit==="lb";
    const numSets = totalSetCount(exIdx);
    const exData  = setData[exIdx]||{};
    const sessionOrms = Object.values(exData).filter(s=>s.weight&&s.reps).map(s=>calc1RM(parseFloat(s.weight),parseInt(s.reps))).filter(Boolean);
    const sessionBest1RM = sessionOrms.length?Math.max(...sessionOrms):null;
    const totalReps   = Object.values(exData).reduce((sum,s)=>sum+(parseInt(s.reps)||0),0);
    const lastWeightV = [...Object.values(exData)].filter(s=>s.weight).slice(-1)[0]?.weight||0;

    const parseReps = (raw,count) => {
      const parts = String(raw).replace(/[-–]/g,",").split(",").map(s=>s.trim()).filter(Boolean);
      if(parts.length>=count) return parts.slice(0,count);
      return Array.from({length:count},()=>parts[0]||"");
    };
    const prescribedPerSet = parseReps(blk.reps, numSets);

    // Parse percentages — e.g. "70,75,75,80,80" → [70,75,75,80,80]
    const parsePcts = (raw,count) => {
      if (!raw) return Array(count).fill(null);
      const parts = String(raw).replace(/[-–]/g,",").split(",").map(s=>parseFloat(s.trim())).filter(n=>!isNaN(n));
      if(parts.length>=count) return parts.slice(0,count);
      const base = parts[0]||null;
      return Array.from({length:count},(_,i)=>parts[i]??base);
    };
    const pctPerSet = parsePcts(blk.pcts, numSets);

    // Recommended weight = round(1RM * pct/100) to nearest 5
    const roundTo5 = (n) => Math.round(n/5)*5;
    const recWeight = (si) => {
      const pct = pctPerSet[si];
      if (!pct || !wMax) return null;
      return roundTo5(wMax * pct / 100);
    };

    return (
      <div className="screen" style={{background:"var(--navy)",display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div className="th-dots-bar">
          <button className="th-collapse-btn" onClick={()=>setExIdx(null)}>✕</button>
          <div className="th-dots">
            {(dayWorkout.blocks||[]).map((_,i)=>{
              const d=blockDoneCount(i),t=totalSetCount(i);
              return <div key={i} className={`th-dot ${i===exIdx?"active":d>0&&d>=t?"complete":d>0?"partial":""}`} onClick={()=>setExIdx(i)}/>;
            })}
          </div>
          <div style={{width:28}}/>
        </div>
        <div className="th-totals">
          <span className="th-total-val">{totalReps} <span className="th-total-lbl">REPS</span></span>
          <span style={{color:"var(--gray)",margin:"0 .5rem"}}>·</span>
          <span className="th-total-val">{lastWeightV} <span className="th-total-lbl">LB</span></span>
        </div>
        <div className="th-ex-header">
          <div style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:ex.videoUrl?".75rem":"0"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:"1rem",color:"var(--gold)",
              width:32,height:32,border:"2px solid var(--gold)",borderRadius:"50%",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{blk.label}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                <div className="th-ex-big-name">{ex.name}</div>
                {isSwapped && (
                  <span style={{fontSize:".65rem",background:"rgba(232,184,75,.15)",color:"var(--gold)",
                    border:"1px solid rgba(232,184,75,.4)",borderRadius:4,padding:".1rem .4rem",fontWeight:600}}>
                    SWAPPED
                  </span>
                )}
              </div>
              <div className="th-ex-prescribed">{blk.sets} sets × {blk.reps}{blk.notes?` · ${blk.notes}`:""}</div>
            </div>
            <button onClick={()=>setShowSwapPicker(true)}
              style={{background:"transparent",border:"1px solid var(--border)",color:"var(--gray)",
                borderRadius:8,padding:".35rem .65rem",cursor:"pointer",fontSize:".75rem",
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,letterSpacing:".04em",
                flexShrink:0,whiteSpace:"nowrap"}}>
              ⇄ Swap
            </button>
          </div>
          {ex.videoUrl && (
            <a href={ex.videoUrl} target="_blank" rel="noreferrer"
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:".6rem",
                background:"#ff0000",color:"#fff",borderRadius:10,padding:".75rem 1rem",
                textDecoration:"none",fontFamily:"'Barlow Condensed',sans-serif",
                fontSize:"1.05rem",fontWeight:700,letterSpacing:".06em",width:"100%",
                boxShadow:"0 4px 14px rgba(255,0,0,.3)",
                marginBottom: ex.substituteId ? ".5rem" : "0"}}>
              <span style={{fontSize:"1.2rem"}}>▶</span>
              Watch Exercise Demo on YouTube
            </a>
          )}
          {ex.substituteId && (() => {
            const sub = library.find(e2 => e2.id === ex.substituteId);
            if (!sub) return null;
            return (
              <div style={{background:"rgba(232,184,75,.08)",border:"1px solid var(--gold)",
                borderRadius:10,padding:".75rem 1rem",display:"flex",alignItems:"center",gap:".75rem"}}>
                <span style={{fontSize:"1.3rem",flexShrink:0}}>⇄</span>
                <div>
                  <div style={{fontSize:".7rem",color:"var(--gold)",letterSpacing:".08em",
                    textTransform:"uppercase",fontWeight:600,marginBottom:".15rem"}}>
                    No equipment? Substitute with
                  </div>
                  <div style={{fontWeight:700,fontSize:"1rem"}}>{sub.name}</div>
                </div>
              </div>
            );
          })()}
        </div>
        {(() => {
          const pr = isNewPR(logs, athlete.id, ex.name, exData);
          return (last||wMax||sessionBest1RM) ? (
            <div className="th-history-bar" style={pr?{background:"rgba(245,158,11,.08)",borderColor:"rgba(245,158,11,.4)"}:{}}>
              {last && <div className="th-hist-block">
                <div className="th-hist-label">Last Session</div>
                <div className="th-hist-val" style={{color:"var(--gold)"}}>{last.sets.length}×{last.sets[0]?.reps} @ {Math.max(...last.sets.map(s=>s.weight))} lb</div>
              </div>}
              {wMax && <div className="th-hist-block">
                <div className="th-hist-label">Working Max (~1RM)</div>
                <div className="th-hist-val" style={{color:"var(--success)"}}>{wMax} lb</div>
              </div>}
              {sessionBest1RM && <div className="th-hist-block">
                <div className="th-hist-label" style={{color:pr?"#f59e0b":undefined}}>
                  {pr ? "🏆 NEW PR!" : "Today's ~1RM"}
                </div>
                <div className="th-hist-val" style={{color:pr?"#f59e0b":"#a78bfa",fontSize:pr?"1.15rem":"1rem"}}>
                  {sessionBest1RM} lb
                </div>
              </div>}
            </div>
          ) : null;
        })()}
        {/* Weight sparkline — last 8 sessions for this exercise */}
        {isWeighted && (() => {
          const history = logs
            .filter(l => l.athleteId===athlete.id && l.exerciseName===ex.name && l.weight>0)
            .reduce((acc, l) => {
              if (!acc[l.date]) acc[l.date] = [];
              acc[l.date].push(l.weight);
              return acc;
            }, {});
          const sessions = Object.entries(history)
            .sort(([a],[b]) => a.localeCompare(b))
            .slice(-8)
            .map(([date, weights]) => ({ date, max: Math.max(...weights) }));
          if (sessions.length < 2) return null;
          const maxW = Math.max(...sessions.map(s=>s.max));
          const minW = Math.min(...sessions.map(s=>s.max));
          const range = maxW - minW || 1;
          return (
            <div style={{padding:".75rem 1.25rem .5rem",borderBottom:"1px solid var(--border)"}}>
              <div style={{fontSize:".65rem",color:"var(--gray)",letterSpacing:".08em",
                textTransform:"uppercase",marginBottom:".5rem"}}>
                Weight History — Last {sessions.length} Sessions
              </div>
              <div style={{display:"flex",alignItems:"flex-end",gap:3,height:40}}>
                {sessions.map((s,i)=>{
                  const heightPct = 20 + ((s.max-minW)/range)*80;
                  const isLast = i===sessions.length-1;
                  return (
                    <div key={s.date} style={{flex:1,display:"flex",flexDirection:"column",
                      alignItems:"center",gap:2}}>
                      <div style={{width:"100%",borderRadius:3,
                        background:isLast?"var(--gold)":"rgba(232,184,75,.35)",
                        height:`${heightPct}%`,minHeight:4,transition:"height .3s"}}/>
                      <div style={{fontSize:".55rem",color:isLast?"var(--gold)":"var(--gray)",
                        fontFamily:"'Barlow Condensed',sans-serif",fontWeight:isLast?700:400}}>
                        {s.max}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {(() => {
          const hasPcts = pctPerSet.some(p=>p!==null);
          return (
            <div className="th-sets-area">
              {/* Autofill weight row */}
              {isWeighted && (
                <div style={{display:"flex",gap:".75rem",alignItems:"center",
                  marginBottom:".875rem",padding:".6rem .875rem",
                  background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:10}}>
                  <input
                    type="number" inputMode="decimal"
                    placeholder="Weight to fill all sets"
                    value={autofillWeight}
                    onChange={e=>setAutofillWeight(e.target.value)}
                    style={{flex:1,background:"var(--navy)",border:"1px solid var(--border)",
                      color:"var(--white)",padding:".5rem .75rem",borderRadius:8,
                      fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.1rem",
                      fontWeight:700,outline:"none",textAlign:"center"}}
                  />
                  <span style={{fontSize:".8rem",color:"var(--gray)",flexShrink:0}}>lb</span>
                  <button
                    disabled={!autofillWeight}
                    onClick={()=>{
                      if(!autofillWeight) return;
                      Array.from({length:numSets}).forEach((_,si)=>{
                        updateSet(exIdx, si, "weight", autofillWeight);
                      });
                    }}
                    style={{background:autofillWeight?"var(--gold)":"var(--navy-light)",
                      color:autofillWeight?"var(--navy)":"var(--gray)",
                      border:"none",borderRadius:8,padding:".5rem 1rem",cursor:autofillWeight?"pointer":"default",
                      fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".85rem",
                      flexShrink:0,transition:"all .15s",whiteSpace:"nowrap"}}>
                    Fill All
                  </button>
                </div>
              )}
              {/* % legend strip — only shows if coach set percentages */}
              {hasPcts && wMax && (
                <div style={{background:"rgba(232,184,75,.07)",border:"1px solid var(--border)",
                  borderRadius:8,padding:".6rem .875rem",marginBottom:".75rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:".5rem"}}>
                    <div>
                      <span style={{color:"var(--gold)",fontWeight:600,fontSize:".85rem"}}>
                        {loggedMax ? `~1RM: ${wMax} lb (from your logs)` : `~1RM: ${wMax} lb (manual)`}
                      </span>
                      <div style={{fontSize:".72rem",color:"var(--gray)",marginTop:".1rem"}}>
                        % targets shown — go heavier than suggested to push your max up
                      </div>
                    </div>
                    {!loggedMax && (
                      <div style={{display:"flex",alignItems:"center",gap:".4rem"}}>
                        <input
                          type="number" inputMode="numeric"
                          value={notes[`manual_1rm_${ex.name}`]||""}
                          onChange={e=>setNotes(p=>({...p,[`manual_1rm_${ex.name}`]:e.target.value}))}
                          style={{width:70,background:"var(--navy)",border:"1px solid var(--border)",
                            color:"var(--white)",padding:".35rem .5rem",borderRadius:6,
                            fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",
                            fontWeight:700,outline:"none",textAlign:"center"}}
                        />
                        <span style={{fontSize:".7rem",color:"var(--gray)"}}>lb</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {hasPcts && !wMax && (
                <div style={{background:"rgba(232,184,75,.08)",border:"1px solid var(--gold)",
                  borderRadius:10,padding:".875rem 1rem",marginBottom:".75rem"}}>
                  <div style={{fontSize:".7rem",color:"var(--gold)",letterSpacing:".1em",
                    textTransform:"uppercase",fontWeight:600,marginBottom:".5rem"}}>
                    Enter Your 1RM to Get Weight Targets
                  </div>
                  <div style={{fontSize:".8rem",color:"var(--gray)",marginBottom:".75rem",lineHeight:1.5}}>
                    No {ex.name} history on file yet. Enter your approximate max and the recommended weights will calculate automatically.
                  </div>
                  <div style={{display:"flex",gap:".75rem",alignItems:"center"}}>
                    <input
                      type="number" inputMode="numeric"
                      placeholder="e.g. 225"
                      value={notes[`manual_1rm_${ex.name}`]||""}
                      onChange={e=>setNotes(p=>({...p,[`manual_1rm_${ex.name}`]:e.target.value}))}
                      style={{flex:1,background:"var(--navy)",border:"1px solid var(--border)",
                        color:"var(--white)",padding:".6rem .875rem",borderRadius:8,
                        fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.2rem",
                        fontWeight:700,outline:"none",textAlign:"center"}}
                    />
                    <span style={{fontSize:".85rem",color:"var(--gray)",flexShrink:0}}>lb = your 1RM</span>
                  </div>
                  {notes[`manual_1rm_${ex.name}`] && (
                    <div style={{fontSize:".75rem",color:"var(--success)",marginTop:".5rem"}}>
                      ✓ Using {notes[`manual_1rm_${ex.name}`]} lb as your starting max — targets will appear above
                    </div>
                  )}
                </div>
              )}
              {hasPcts && loggedMax && manualMax && loggedMax !== manualMax && (
                <div style={{fontSize:".7rem",color:"var(--gray)",marginBottom:".5rem",padding:"0 .25rem"}}>
                  Using logged max ({loggedMax} lb) — your manual entry ({manualMax} lb) is overridden by real data
                </div>
              )}
              <div className="th-sets-header">
                <span style={{width:32,textAlign:"center"}}>SET</span>
                <span style={{flex:1,textAlign:"center"}}>{isTimeBased?"TIME (sec)":"REPS"}</span>
                {isWeighted && <span style={{flex:1,textAlign:"center"}}>LB</span>}
                {hasPcts && isWeighted && <span style={{width:52,textAlign:"center",color:"var(--gold)"}}>TARGET</span>}
                <span style={{width:40}}/>
              </div>
              {Array.from({length:numSets}).map((_,si)=>{
                const s=exData[si]||{};
                const rec=recWeight(si);
                const pct=pctPerSet[si];
                return (
                  <div key={si} className={`th-set-row ${s.done?"done":""}`}>
                    <span className="th-set-num">{si+1}</span>
                    <input className="th-set-inp" type="number" inputMode="numeric"
                      placeholder={prescribedPerSet[si]||""}
                      value={isTimeBased?(s.time||""):(s.reps||"")}
                      onChange={e=>updateSet(exIdx,si,isTimeBased?"time":"reps",e.target.value)}/>
                    {isWeighted && (
                      <input className="th-set-inp" type="number" inputMode="decimal"
                        placeholder={rec ? String(rec) : "0"}
                        value={s.weight||""} onChange={e=>updateSet(exIdx,si,"weight",e.target.value)}/>
                    )}
                    {hasPcts && isWeighted && (
                      <div style={{width:52,textAlign:"center",flexShrink:0}}>
                        {rec ? (
                          <div style={{lineHeight:1.2}}>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                              fontSize:".9rem",color:"var(--gold)"}}>{rec}</div>
                            {pct && <div style={{fontSize:".6rem",color:"var(--gray)"}}>{pct}%</div>}
                          </div>
                        ) : pct ? (
                          <div style={{fontSize:".7rem",color:"var(--gray)"}}>{pct}%</div>
                        ) : null}
                      </div>
                    )}
                    <button className={`th-circle-btn ${s.done?"done":""} ${poppingSet===`${exIdx}-${si}`?"pop":""}`} onClick={()=>toggleDone(exIdx,si)}>
                      {s.done?"✓":""}
                    </button>
                  </div>
                );
              })}
              <div className="th-set-controls">
                <button className="th-set-ctrl-btn" onClick={()=>setExtra(p=>({...p,[exIdx]:Math.max(0,(p[exIdx]||0)-1)}))}>－ Set</button>
                <button className="th-set-ctrl-btn" onClick={()=>setExtra(p=>({...p,[exIdx]:(p[exIdx]||0)+1}))}>＋ Set</button>
              </div>
              <input className="th-note-input" placeholder="Add exercise note…"
                value={notes[exIdx]||""} onChange={e=>setNotes(p=>({...p,[exIdx]:e.target.value}))}/>
            </div>
          );
        })()}
        {/* Exercise swap picker modal */}
        {showSwapPicker && (
          <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
            <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)"}}
              onClick={()=>setShowSwapPicker(false)}/>
            <div style={{position:"relative",background:"var(--navy-mid)",borderRadius:"16px 16px 0 0",
              maxHeight:"70vh",display:"flex",flexDirection:"column",
              boxShadow:"0 -8px 40px rgba(0,0,0,.5)"}}>
              <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid var(--border)",
                display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:"1.1rem"}}>
                    Swap Exercise
                  </div>
                  <div style={{fontSize:".75rem",color:"var(--gray)",marginTop:".15rem"}}>
                    This session only — won't change the coach's program
                  </div>
                </div>
                <button onClick={()=>setShowSwapPicker(false)}
                  style={{background:"transparent",border:"none",color:"var(--gray)",
                    fontSize:"1.4rem",cursor:"pointer",padding:".25rem .5rem"}}>✕</button>
              </div>
              {isSwapped && (
                <div style={{padding:".75rem 1.25rem",borderBottom:"1px solid var(--border)",flexShrink:0}}>
                  <button onClick={()=>{ setSwappedExercises(prev=>{const n={...prev};delete n[exIdx];return n;}); setShowSwapPicker(false); }}
                    style={{background:"transparent",border:"1px solid var(--danger)",color:"var(--danger)",
                      borderRadius:8,padding:".4rem 1rem",cursor:"pointer",fontSize:".85rem",
                      fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600}}>
                    ✕ Remove swap — use original exercise
                  </button>
                </div>
              )}
              <div style={{overflowY:"auto",flex:1}}>
                {library
                  .filter(e2=>e2.id!==blk.exerciseId) // exclude current exercise
                  .map(e2=>(
                    <button key={e2.id}
                      onClick={()=>{
                        setSwappedExercises(prev=>({...prev,[exIdx]:e2.id}));
                        setShowSwapPicker(false);
                      }}
                      style={{width:"100%",background:"transparent",border:"none",
                        borderBottom:"1px solid var(--bs)",padding:".875rem 1.25rem",
                        cursor:"pointer",textAlign:"left",color:"var(--white)"}}>
                      <div style={{fontWeight:600,fontSize:".95rem"}}>{e2.name}</div>
                      <div style={{fontSize:".75rem",color:"var(--gray)",marginTop:".1rem"}}>
                        {e2.category}{e2.unit?` · ${e2.unit}`:""}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="th-bottom-nav">
          <button className="th-nav-btn" onClick={()=>{ setAutofillWeight(""); if(exIdx===0)setExIdx(null); else setExIdx(i=>i-1); }}>
            <span>←</span><span>Back</span>
          </button>
          <RestTimer />
          <button className="th-nav-btn" onClick={()=>{ setAutofillWeight(""); if(exIdx===(dayWorkout.blocks||[]).length-1)setExIdx(null); else setExIdx(i=>i+1); }}>
            <span>{exIdx===(dayWorkout.blocks||[]).length-1?"Overview":"Next"}</span><span>→</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Day overview ──
  return (
    <div className="screen">
      <div className="topbar">
        <div className="topbar-brand"><div className="topbar-logo">DU</div>
          <div className="topbar-title">{athlete.name.split(" ")[0]}</div></div>
        <div style={{display:"flex",gap:".5rem"}}>
          <button className="back-btn" onClick={()=>setShowMyProgress(v=>!v)}
            style={showMyProgress?{borderColor:"var(--gold)",color:"var(--gold)"}:{}}>
            {showMyProgress ? "✕" : "📊 My Stats"}
          </button>
          <button className="back-btn" onClick={()=>{ setExIdx(null); onBack(); }}>← Home</button>
        </div>
      </div>
      {showMyProgress && (
        <div className="body-pad" style={{position:"absolute",inset:0,zIndex:50,
          overflowY:"auto",paddingTop:"1rem",
          background:"var(--navy-dark,#0a0f1e)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
              fontSize:"1.3rem",color:"var(--white)"}}>📊 My Profile</div>
            <button className="back-btn" onClick={()=>setShowMyProgress(false)}>✕ Close</button>
          </div>
          <AthleteProgressPanel athlete={athlete} logs={logs} library={library} readiness={readiness} />
        </div>
      )}
      {saved && (
        <div className="success-flash">
          <div className="success-icon">💾</div>
          <div className="success-name">Saved!</div>
          <div className="success-msg">Great work, {athlete.name.split(" ")[0]}.</div>
          {sessionVolume !== null && sessionVolume > 0 && (
            <div style={{marginTop:"1.5rem", textAlign:"center"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontSize:"2.5rem", fontWeight:900,
                color:"var(--gold)", lineHeight:1}}>
                {sessionVolume.toLocaleString()}
              </div>
              <div style={{fontSize:".8rem", color:"var(--gray)", letterSpacing:".1em", textTransform:"uppercase", marginTop:".2rem"}}>
                Total Pounds Moved Today
              </div>
            </div>
          )}
          <div className="success-bar"><div className="success-bar-fill"/></div>
        </div>
      )}

      <WeekCalendar selectedDate={selDate} onSelectDate={setSelDate} scheduled={scheduled} allowFuture={false} />

      <div className="body-pad">
        {isToday && athlete && dayWorkout && autoCheckin(athlete.id, dayWorkout)}
        {!dayWorkout ? (
          <div className="empty-day">
            {noAssignment ? (
              <>
                <div style={{fontSize:"3rem",marginBottom:"1rem"}}>💬</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.75rem",color:"var(--gold)",fontWeight:700}}>
                  Check with your coach
                </div>
                <div style={{color:"var(--gray)",marginTop:".5rem",lineHeight:1.5}}>
                  A workout is scheduled today but you haven't been assigned to one yet.
                  Check with Coach {athletes.find(a=>a.id===athlete?.id)?.name?.split(" ")[0]||"your coach"} for instructions.
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:"3rem",marginBottom:"1rem"}}>
                  {isFuture ? "📅" : "😴"}
                </div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.75rem",color:"var(--gold)",fontWeight:700}}>
                  {isToday ? "Rest Day" : isFuture ? "Rest Day" : "No Workout"}
                </div>
                <div style={{color:"var(--gray)",marginTop:".5rem"}}>
                  {isToday ? "Nothing scheduled today. Check back tomorrow."
                    : isFuture ? `Nothing scheduled for ${fmtDate(selDate)} yet.`
                    : `No workout was scheduled on ${fmtDate(selDate)}.`}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
              <div>
                <div style={{fontSize:".75rem",color:isToday?"var(--gold)":"var(--gray)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".2rem"}}>
                  {isToday?"Today":fmtDate(selDate)}
                </div>
                <div className="section-title" style={{margin:0}}>{dayWorkout.title}</div>
              </div>
              <div style={{display:"flex",gap:".5rem",alignItems:"center",flexWrap:"wrap"}}>
                {dayWorkout.phase && (
                  <span style={{fontSize:".7rem",background:"rgba(139,92,246,.15)",color:"#a78bfa",
                    border:"1px solid rgba(139,92,246,.3)",borderRadius:5,padding:".15rem .5rem",
                    fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,letterSpacing:".04em"}}>
                    {dayWorkout.phase}
                  </span>
                )}
                <div style={{display:"flex",gap:".5rem",alignItems:"center",flexWrap:"wrap"}}>
              {dayWorkout.phase && (
                <span style={{fontSize:".7rem",background:"rgba(139,92,246,.15)",color:"#a78bfa",
                  border:"1px solid rgba(139,92,246,.3)",borderRadius:5,padding:".15rem .5rem",
                  fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,letterSpacing:".04em"}}>
                  {dayWorkout.phase}
                </span>
              )}
              <div className="workout-badge">{dayWorkout.type||"Strength"}</div>
            </div>
              </div>
            </div>

            {dayWorkout.coachNote && (
              <div className="coach-note-box">
                <div className="coach-note-label">Coach's Note</div>
                <div className="coach-note-text">{dayWorkout.coachNote}</div>
              </div>
            )}

            {/* Past session summary banner */}
            {isPast && (() => {
              const dayLogs = logs.filter(l=>l.athleteId===athlete.id&&l.date===selDate&&l.weight>0);
              const volume  = dayLogs.reduce((sum,l)=>sum+(l.weight*(l.reps||1)),0);
              const prCount = (() => {
                const seen=new Set();
                return dayLogs.filter(l=>{
                  if(seen.has(l.exerciseName))return false; seen.add(l.exerciseName);
                  const dayMax=Math.max(...dayLogs.filter(x=>x.exerciseName===l.exerciseName).map(x=>calc1RM(x.weight,x.reps)).filter(Boolean));
                  const prior=logs.filter(x=>x.athleteId===athlete.id&&x.exerciseName===l.exerciseName&&x.date<selDate&&x.weight>0);
                  const prevMax=prior.length?Math.max(...prior.map(x=>calc1RM(x.weight,x.reps)).filter(Boolean)):null;
                  return prevMax!==null&&dayMax>prevMax;
                }).length;
              })();
              if(!dayLogs.length) return (
                <div style={{background:"rgba(255,255,255,.03)",border:"1px solid var(--border)",
                  borderRadius:10,padding:".75rem 1rem",marginBottom:"1rem",
                  fontSize:".85rem",color:"var(--gray)",textAlign:"center",fontStyle:"italic"}}>
                  No sets were logged for this session
                </div>
              );
              return (
                <div style={{background:"rgba(46,204,113,.06)",border:"1px solid rgba(46,204,113,.25)",
                  borderRadius:10,padding:".75rem 1rem",marginBottom:"1rem",
                  display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
                  <div style={{textAlign:"center",flex:1}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.3rem",fontWeight:700,color:"var(--success)"}}>
                      {volume.toLocaleString()}
                    </div>
                    <div style={{fontSize:".65rem",color:"var(--gray)",textTransform:"uppercase",letterSpacing:".06em"}}>lbs moved</div>
                  </div>
                  <div style={{textAlign:"center",flex:1}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.3rem",fontWeight:700,color:"var(--success)"}}>
                      {dayLogs.length}
                    </div>
                    <div style={{fontSize:".65rem",color:"var(--gray)",textTransform:"uppercase",letterSpacing:".06em"}}>sets logged</div>
                  </div>
                  {prCount>0 && (
                    <div style={{textAlign:"center",flex:1}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.3rem",fontWeight:700,color:"#f59e0b"}}>
                        {prCount} 🏆
                      </div>
                      <div style={{fontSize:".65rem",color:"var(--gray)",textTransform:"uppercase",letterSpacing:".06em"}}>PRs</div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Future workout preview banner */}
            {isFuture && (
              <div style={{background:"rgba(139,92,246,.06)",border:"1px solid rgba(139,92,246,.25)",
                borderRadius:10,padding:".75rem 1rem",marginBottom:"1rem",
                display:"flex",alignItems:"center",gap:".6rem",fontSize:".85rem"}}>
                <span style={{fontSize:"1rem",flexShrink:0}}>📅</span>
                <span style={{color:"var(--gray)"}}>
                  Upcoming — {fmtDate(selDate)}. This is what's planned.
                </span>
              </div>
            )}

            {/* Readiness load recommendation banner */}
            {isToday && (() => {
              const todayReadiness = readiness.filter(r=>r.athleteId===athlete.id&&r.date===TODAY);
              if(!todayReadiness.length) return null;
              const r = todayReadiness[todayReadiness.length-1];
              const composite = (r.sleep||3) + (6-(r.soreness||3)) + (6-(r.stress||3));
              if(composite > 8) return null; // only show when they're flagged low
              const msgs = [];
              if(r.sleep<=2) msgs.push("short on sleep");
              if(r.soreness>=4) msgs.push("high soreness");
              if(r.stress>=4) msgs.push("elevated stress");
              return (
                <div style={{background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.35)",
                  borderRadius:10,padding:".75rem 1rem",marginBottom:"1rem",
                  display:"flex",alignItems:"flex-start",gap:".6rem"}}>
                  <span style={{fontSize:"1.1rem",flexShrink:0}}>⚠️</span>
                  <div>
                    <div style={{fontSize:".8rem",fontWeight:600,color:"#fbbf24",marginBottom:".2rem"}}>
                      Heads up — load may need adjusting today
                    </div>
                    <div style={{fontSize:".75rem",color:"var(--gray)"}}>
                      You reported {msgs.join(", ")}. Consider staying lighter than usual and focusing on quality.
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Limitation / injury flag */}
            {isToday && (
              <div style={{marginBottom:"1rem"}}>
                {limitation ? (
                  <div style={{background:"rgba(231,76,60,.08)",border:"1px solid rgba(231,76,60,.35)",
                    borderRadius:10,padding:".75rem 1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
                      <span style={{fontSize:"1rem",flexShrink:0}}>🩹</span>
                      <div>
                        <div style={{fontSize:".72rem",color:"var(--danger)",fontWeight:600,letterSpacing:".06em",textTransform:"uppercase"}}>
                          Limitation Noted
                        </div>
                        <div style={{fontSize:".85rem",color:"var(--white)",marginTop:".1rem"}}>{limitation}</div>
                      </div>
                    </div>
                    <button onClick={()=>{setLimitation(""); setShowLimitInput(false);}}
                      style={{background:"transparent",border:"none",color:"var(--gray)",cursor:"pointer",fontSize:"1rem",padding:".25rem"}}>
                      ✕
                    </button>
                  </div>
                ) : showLimitInput ? (
                  <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",
                    borderRadius:10,padding:".75rem 1rem"}}>
                    <div style={{fontSize:".75rem",color:"var(--gray)",marginBottom:".5rem"}}>
                      Describe your limitation (coaches can see this):
                    </div>
                    <div style={{display:"flex",gap:".5rem"}}>
                      <input autoFocus className="form-input"
                        placeholder="e.g. left knee pain, tight lower back"
                        value={limitation}
                        onChange={e=>setLimitation(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter"&&limitation.trim())setShowLimitInput(false);}}
                        style={{flex:1,fontSize:".9rem"}}/>
                      <button className="gold-btn" style={{padding:".4rem .875rem",fontSize:".85rem"}}
                        disabled={!limitation.trim()}
                        onClick={()=>setShowLimitInput(false)}>
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>setShowLimitInput(true)}
                    style={{background:"transparent",border:"1px dashed var(--border)",color:"var(--gray)",
                      borderRadius:10,padding:".5rem 1rem",cursor:"pointer",fontSize:".8rem",
                      width:"100%",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,
                      letterSpacing:".05em"}}>
                    🩹 Flag a limitation or injury
                  </button>
                )}
              </div>
            )}

            {/* Progress banner */}
            {isToday && (() => {
              const started = (dayWorkout.blocks||[]).filter((_,bi)=>blockDoneCount(bi)>0).length;
              if(!started) return null;
              return (
                <div style={{background:"rgba(232,184,75,.08)",border:"1px solid var(--border)",borderRadius:10,
                  padding:".75rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:".8rem",color:"var(--gray)"}}>Progress saved — leave and come back anytime</div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",color:"var(--gold)",fontWeight:700,fontSize:".95rem"}}>
                    {started}/{(dayWorkout.blocks||[]).length} done
                  </div>
                </div>
              );
            })()}

            {/* Past-day read-only log */}
            {!isToday && (() => {
              const dayLogs = logs.filter(l=>l.athleteId===athlete.id&&l.date===selDate);
              if(!dayLogs.length) return (
                <div style={{color:"var(--gray)",fontSize:".85rem",marginBottom:"1rem",textAlign:"center"}}>No logged data for this session.</div>
              );
              const byEx = {};
              dayLogs.forEach(l=>{ if(!byEx[l.exerciseName]) byEx[l.exerciseName]=[]; byEx[l.exerciseName].push(l); });
              return (
                <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden",marginBottom:"1rem"}}>
                  <div style={{padding:".75rem 1rem",borderBottom:"1px solid var(--border)",fontSize:".75rem",color:"var(--gray)",letterSpacing:".1em",textTransform:"uppercase"}}>Your Log</div>
                  {Object.entries(byEx).map(([name,sets])=>(
                    <div key={name} style={{padding:".75rem 1rem",borderBottom:"1px solid var(--bs)"}}>
                      <div style={{fontWeight:600,marginBottom:".4rem"}}>{name}</div>
                      <div style={{display:"flex",gap:".5rem",flexWrap:"wrap"}}>
                        {sets.sort((a,b)=>a.set-b.set).map((s,i)=>(
                          <div key={i} style={{background:"var(--navy)",borderRadius:6,padding:".3rem .6rem",fontSize:".8rem",color:"var(--gold)"}}>
                            Set {s.set}: {s.reps>0?`${s.reps}×`:"—"}{s.weight>0?`${s.weight}lb`:""}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Exercise list */}
            {(() => {
              const groups = groupBlocks(dayWorkout.blocks || []);
              return groups.map((group, gi) => {
                if (group.type === "superset") {
                  // ── Superset card ──
                  const allDone = group.items.every(item => {
                    const d = blockDoneCount(item.blockIdx);
                    return d > 0 && d >= totalSetCount(item.blockIdx);
                  });
                  return (
                    <div key={gi} style={{background:"var(--navy-light)",border:"2px solid var(--gold-dim)",
                      borderRadius:12,marginBottom:".75rem",overflow:"hidden"}}>
                      <div style={{background:"rgba(232,184,75,.08)",padding:".4rem 1rem",
                        display:"flex",alignItems:"center",gap:".5rem",borderBottom:"1px solid var(--border)"}}>
                        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                          color:"var(--gold)",fontSize:".8rem",letterSpacing:".08em"}}>
                          ⚡ SUPERSET {group.prefix}
                        </span>
                        <span style={{fontSize:".7rem",color:"var(--gray)"}}>— complete back to back</span>
                      </div>
                      {group.items.map(item => {
                        const ex = resolveEx(item); if (!ex) return null;
                        const last = getLastSession(logs,athlete.id,ex.name);
                        const wMax = getWorkingMax(logs,athlete.id,ex.name);
                        const done = blockDoneCount(item.blockIdx);
                        const total = totalSetCount(item.blockIdx);
                        const pr = isNewPR(logs,athlete.id,ex.name,setData[item.blockIdx]);
                        const isComplete = done>0&&done>=total;
                        return (
                          <div key={item.blockIdx} className="th-exercise-row"
                            style={{borderRadius:0,border:"none",borderBottom:"1px solid var(--bs)",
                              cursor:isToday?"pointer":"default",
                              opacity:isPast||isFuture?.9:1}}
                            onClick={()=>isToday?setExIdx(item.blockIdx):null}>
                            <div className={`th-ex-label ${isComplete?"done":""}`} style={{flexShrink:0}}>
                              {isComplete?"✓":item.label}
                            </div>
                            <div className="th-ex-main">
                              <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                                <div className="th-ex-name">{ex.name}</div>
                                {pr && <span style={{fontSize:"1rem"}} title="New PR!">🏆</span>}
                                {ex.videoUrl && <a href={ex.videoUrl} target="_blank" rel="noreferrer"
                                  onClick={e=>e.stopPropagation()}
                                  style={{display:"inline-flex",alignItems:"center",gap:".3rem",background:"#ff0000",
                                    color:"#fff",borderRadius:6,padding:".3rem .7rem",fontSize:".8rem",
                                    fontWeight:700,textDecoration:"none",fontFamily:"'Barlow Condensed',sans-serif",
                                    boxShadow:"0 2px 8px rgba(255,0,0,.35)"}}>
                                  ▶ Watch</a>}
                              </div>
                              <div className="th-ex-spec">{item.sets} × {item.reps}{item.notes?` · ${item.notes}`:""}</div>
                              {last && <div className="th-ex-last">Last: {last.sets.map(s=>`${s.weight}lb×${s.reps}`).join(", ")}{wMax?` · ~1RM ${wMax}lb`:""}</div>}
                            </div>
                            <div className="th-ex-status">
                              {done>0
                                ? <div style={{textAlign:"center"}}><div style={{color:pr?"#f59e0b":"var(--gold)",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",fontWeight:700}}>{done}/{total}</div><div style={{fontSize:".65rem",color:"var(--gray)"}}>sets</div></div>
                                : <span style={{color:"var(--gray)",fontSize:"1.2rem"}}>{isToday?"›":isFuture?"📅":""}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                // ── Single exercise ──
                const item = group.item;
                const blk = dayWorkout.blocks[item.blockIdx];
                const ex=resolveEx(blk); if(!ex) return null;
                const last=getLastSession(logs,athlete.id,ex.name);
                const wMax=getWorkingMax(logs,athlete.id,ex.name);
                const done=blockDoneCount(item.blockIdx);
                const total=totalSetCount(item.blockIdx);
                const pr=isNewPR(logs,athlete.id,ex.name,setData[item.blockIdx]);
                const isComplete=done>0&&done>=total;

                // Past: find what athlete actually logged for this exercise on selDate
                const pastSets = isPast
                  ? logs.filter(l=>l.athleteId===athlete.id&&l.exerciseName===ex.name&&l.date===selDate)
                      .sort((a,b)=>a.set-b.set)
                  : [];
                const pastPR = isPast && pastSets.length>0 && (() => {
                  const dayMax = Math.max(...pastSets.map(s=>calc1RM(s.weight,s.reps)).filter(Boolean));
                  const prevLogs = logs.filter(l=>l.athleteId===athlete.id&&l.exerciseName===ex.name&&l.date<selDate&&l.weight>0);
                  const prevMax = prevLogs.length ? Math.max(...prevLogs.map(l=>calc1RM(l.weight,l.reps)).filter(Boolean)) : null;
                  return prevMax!==null && dayMax>prevMax;
                })();

                return (
                  <div key={gi} className="th-exercise-row"
                    onClick={()=>isToday?setExIdx(item.blockIdx):null}
                    style={{cursor:isToday?"pointer":"default",
                      opacity:isFuture?.85:1,
                      background:pastSets.length>0?"rgba(46,204,113,.03)":""}}>
                    <div className={`th-ex-label ${isComplete||pastSets.length>0?"done":""}`}>
                      {isComplete||pastSets.length>0?"✓":blk.label}
                    </div>
                    <div className="th-ex-main">
                      <div style={{display:"flex",alignItems:"center",gap:".5rem",flexWrap:"wrap"}}>
                        <div className="th-ex-name">{ex.name}</div>
                        {(pr||pastPR) && <span style={{fontSize:"1rem"}} title="PR!">🏆</span>}
                        {isFuture && <span style={{fontSize:".65rem",color:"var(--gray)",
                          background:"var(--navy)",border:"1px solid var(--border)",
                          borderRadius:4,padding:".1rem .4rem"}}>upcoming</span>}
                        {ex.videoUrl && <a href={ex.videoUrl} target="_blank" rel="noreferrer"
                          onClick={e=>e.stopPropagation()}
                          style={{display:"inline-flex",alignItems:"center",gap:".3rem",background:"#ff0000",
                            color:"#fff",borderRadius:6,padding:".3rem .7rem",fontSize:".8rem",
                            fontWeight:700,textDecoration:"none",flexShrink:0,fontFamily:"'Barlow Condensed',sans-serif",
                            boxShadow:"0 2px 8px rgba(255,0,0,.35)"}}>
                          ▶ Watch
                        </a>}
                      </div>
                      <div className="th-ex-spec">{blk.sets} × {blk.reps}{blk.notes?` · ${blk.notes}`:""}</div>

                      {/* Past session: show what they actually logged */}
                      {isPast && pastSets.length>0 && (
                        <div style={{marginTop:".35rem"}}>
                          <div style={{fontSize:".7rem",color:"var(--success)",fontWeight:600,
                            letterSpacing:".05em",textTransform:"uppercase",marginBottom:".2rem"}}>
                            Logged
                          </div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:".3rem"}}>
                            {pastSets.map((s,i)=>(
                              <span key={i} style={{fontSize:".75rem",background:"rgba(46,204,113,.1)",
                                border:"1px solid rgba(46,204,113,.3)",borderRadius:5,
                                padding:".15rem .5rem",color:"var(--success)"}}>
                                {s.weight>0?`${s.weight}lb`:""}{s.weight>0&&s.reps>0?"×":""}{s.reps>0?`${s.reps}`:s.weight>0?"":"-"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {isPast && pastSets.length===0 && (
                        <div style={{fontSize:".72rem",color:"var(--gray)",fontStyle:"italic",marginTop:".2rem"}}>
                          Not logged
                        </div>
                      )}

                      {/* Today/future: show last session context */}
                      {!isPast && last && <div className="th-ex-last">Last: {last.sets.map(s=>`${s.weight}lb×${s.reps}`).join(", ")}{wMax?` · ~1RM ${wMax}lb`:""}</div>}
                      {!isPast && !last&&wMax && <div className="th-ex-last">Best ~1RM: {wMax} lb</div>}
                    </div>
                    <div className="th-ex-status">
                      {isToday && done>0
                        ? <div style={{textAlign:"center"}}><div style={{color:pr?"#f59e0b":"var(--gold)",fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",fontWeight:700}}>{done}/{total}</div><div style={{fontSize:".65rem",color:"var(--gray)"}}>sets</div></div>
                        : <span style={{color:"var(--gray)",fontSize:"1.2rem"}}>{isToday?"›":isFuture?"📅":""}</span>}
                    </div>
                  </div>
                );
              });
            })()}

            {isToday && (
              <>
                <button className="gold-btn"
                  style={{width:"100%",marginTop:"1.5rem",padding:"1rem",fontSize:"1.15rem",
                    background:saveError?"var(--danger)":undefined,
                    opacity:saving?0.6:1}}
                  disabled={saving}
                  onClick={saveWorkout}>
                  {saving ? "Saving…" : saveError ? "⚠️ Save Failed — Tap to Retry" : "Finish & Save Workout"}
                </button>
                {saveError && (
                  <div style={{fontSize:".8rem",color:"var(--danger)",textAlign:"center",marginTop:".5rem"}}>
                    Connection issue. Check your internet and try again.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIN
// ═══════════════════════════════════════════════════════════════════════════════
function PinScreen({ onSuccess, onBack }) {
  const [pin,setPin]=useState(""); const [error,setError]=useState(false);
  const press=(d)=>{ if(pin.length>=4)return; const n=pin+d; setPin(n);
    if(n.length===4){ if(n===ADMIN_PIN)onSuccess(); else{setError(true);setTimeout(()=>{setPin("");setError(false);},800);} } };
  return (
    <div className="pin-overlay">
      <div className="logo-letters" style={{fontSize:"3rem"}}>DU</div>
      <div className="pin-title">Coach Access</div>
      <div className="pin-dots">{[0,1,2,3].map(i=><div key={i} className={`pin-dot ${pin.length>i?"filled":""}`} style={error?{borderColor:"var(--danger)",background:pin.length>i?"var(--danger)":""}:{}}/>)}</div>
      {error&&<div className="pin-error">Incorrect PIN</div>}
      <div className="pin-numpad">
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
          <button key={i} className="pin-key" style={k===""?{visibility:"hidden"}:{}}
            onClick={()=>k==="⌫"?setPin(p=>p.slice(0,-1)):press(String(k))}>{k}</button>
        ))}
      </div>
      <button className="back-btn" onClick={onBack}>← Back</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN — calendar-based schedule tab
// ═══════════════════════════════════════════════════════════════════════════════
function AdminScreen({ athletes, setAthletes, library, setLibrary, scheduled, setScheduled, logs, checkins, thought, saveThought, thoughtHistory, readiness, routines, saveRoutines, groups, saveGroups, gameDay, saveGameDay, onBack }) {
  const [tab,setTab]=useState("overview");
  return (
    <div className="screen">
      <div className="topbar">
        <div className="topbar-brand"><div className="topbar-logo">DU</div><div className="topbar-title">Coach Dashboard</div></div>
        <button className="back-btn" onClick={onBack}>← Home</button>
      </div>
      <div className="admin-body">
        {/* Admin tabs — grouped by function */}
        <div style={{marginBottom:"2rem"}}>
          {/* Primary nav */}
          <div className="admin-tabs" style={{marginBottom:".5rem"}}>
            {[["overview","📊 Overview"],["schedule","📅 Schedule"],["library","📚 Library"],["routines","⚡ Routines"],["groups","👥 Groups"]].map(([t,l])=>(
              <button key={t} className={`admin-tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{l}</button>
            ))}
          </div>
          {/* Secondary nav — team management */}
          <div className="admin-tabs" style={{marginBottom:0}}>
            {[["roster","👥 Roster"],["progress","📈 Progressions"],["attendance","📋 Attendance"],["thought","💬 Thought"]].map(([t,l])=>(
              <button key={t} className={`admin-tab ${tab===t?"active":""}`}
                style={{fontSize:".8rem",padding:".4rem .75rem",opacity:.85}}
                onClick={()=>setTab(t)}>{l}</button>
            ))}
          </div>
        </div>
        {tab==="overview"   && <OverviewTab athletes={athletes} logs={logs} checkins={checkins} scheduled={scheduled} readiness={readiness} gameDay={gameDay} saveGameDay={saveGameDay}/>}
        {tab==="schedule"   && <ScheduleTab library={library} setLibrary={setLibrary} scheduled={scheduled} setScheduled={setScheduled} routines={routines} athletes={athletes} groups={groups}/>}
        {tab==="library"    && <LibraryTab  library={library} setLibrary={setLibrary}/>}
        {tab==="progress"   && <ProgressTab athletes={athletes} logs={logs} scheduled={scheduled} groups={groups}/>}
        {tab==="roster"     && <RosterTab athletes={athletes} setAthletes={setAthletes}/>}
        {tab==="thought"    && <ThoughtTab thought={thought} saveThought={saveThought} thoughtHistory={thoughtHistory}/>}
        {tab==="routines"   && <RoutinesTab library={library} setLibrary={setLibrary} routines={routines} saveRoutines={saveRoutines}/>}
        {tab==="groups"     && <GroupsTab athletes={athletes} groups={groups} saveGroups={saveGroups}/>}
        {tab==="attendance" && <AttendanceTab athletes={athletes} checkins={checkins} logs={logs} excused={excused} saveExcused={saveExcused}/>}
      </div>
    </div>
  );
}

// ─── SCHEDULE TAB  — calendar at top, click day to edit/create ────────────────
function ScheduleTab({ library, setLibrary, scheduled, setScheduled, routines, athletes, groups }) {
  const [selDate,   setSelDate]   = useState(TODAY);
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState({ title:"", type:"Strength", coachNote:"", phase:"", blocks:[], assignedTo:{type:"all",groupIds:[],playerIds:[]} });
  const [showPicker,        setShowPicker]         = useState(false);
  const [showRoutinePicker, setShowRoutinePicker]  = useState(false);
  const [copyMode,  setCopyMode]  = useState(false);
  const [copyTarget,setCopyTarget]= useState("");
  const [bulkDates,      setBulkDates]      = useState([]);
  const [bulkMode,       setBulkMode]       = useState(false);
  const [exSearch,       setExSearch]       = useState(""); // search workouts by exercise

  const dayWorkouts = scheduled.filter(s=>s.date===selDate); // multiple workouts per day
  const dayWorkout  = dayWorkouts[0] || null; // backward compat for save logic

  const [editingId, setEditingId] = useState(null); // which workout is being edited

  const openEdit = (w) => {
    setEditingId(w.id);
    setForm({ title:w.title, type:w.type, coachNote:w.coachNote||"", phase:w.phase||"",
      blocks:applyLabels(w.blocks.map(b=>({...b}))),
      assignedTo:w.assignedTo||{type:"all",groupIds:[],playerIds:[]} });
    setEditing(true);
  };
  const openNew = () => {
    setEditingId(null);
    setForm({ title:"", type:"Strength", coachNote:"", phase:"", blocks:[], assignedTo:{type:"all",groupIds:[],playerIds:[]} });
    setEditing(true);
  };
  const save = () => {
    if (!form.title.trim()) return;
    let updatedList;
    let recordToSave;
    if (editingId) {
      // editing existing workout — only update that one record
      const updated = {...scheduled.find(w=>w.id===editingId)||{}, ...form, id:editingId, date:selDate};
      updatedList = scheduled.map(w => w.id===editingId ? updated : w);
      recordToSave = updated;
    } else {
      // new workout for this date
      const newWorkout = {type:"Strength", id:`sw${Date.now()}`, date:selDate, ...form};
      updatedList = [...scheduled, newWorkout];
      recordToSave = newWorkout;
    }
    // Update screen immediately
    setScheduled(updatedList);
    setEditing(false);
    // Write only the changed/new record to Supabase
    supabase
      .from("scheduled")
      .upsert([{ id: recordToSave.id, data: recordToSave }], { onConflict: "id" })
      .then(({ error }) => {
        if (error) console.error("Supabase save error:", error.message);
      });
  };
  const deleteWorkout = () => {
    if (!editingId) return;
    const updatedList = scheduled.filter(w => w.id!==editingId);
    setScheduled(updatedList);
    setEditing(false);
    supabase.from("scheduled").delete().eq("id", editingId)
      .then(({ error }) => { if (error) console.error("Delete error:", error.message); });
  };
  const addBlock = (ex) => {
    setForm(f=>{
      const newBlocks = [...(f.blocks||[]), {label:"", groupWithNext:false, exerciseId:ex.id, sets:3, reps:"8", notes:"", pcts:""}];
      return {...f, blocks:applyLabels(newBlocks)};
    });
    setShowPicker(false);
  };
  const updateBlock = (i,field,val) => setForm(f=>{
    const blocks = f.blocks.map((b,bi)=>bi===i?{...b,[field]:val}:b);
    // Re-apply labels when groupWithNext changes
    return {...f, blocks: field==="groupWithNext" ? applyLabels(blocks) : blocks};
  });
  const removeBlock = (i) => setForm(f=>({...f, blocks:applyLabels(f.blocks.filter((_,bi)=>bi!==i))}));

  if (editing) return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
        <div>
          <div className="section-title" style={{margin:0}}>
            {editingId ? "Edit Workout" : dayWorkouts.length>0 ? "Add Another Workout" : "New Workout"}
          </div>
          <div style={{fontSize:".8rem",color:"var(--gold)",marginTop:".2rem"}}>{fmtDate(selDate)}</div>
        </div>
        <button className="back-btn" onClick={()=>setEditing(false)}>← Cancel</button>
      </div>
      <div className="builder-form">
        <div className="form-row">
          <div className="form-field" style={{marginBottom:0}}>
            <label>Title</label>
            <input className="form-input" placeholder="Lower Body Strength" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
          </div>
          <div className="form-field" style={{marginBottom:0}}>
            <label>Type</label>
            <select className="form-input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
              {["Strength","Conditioning","Speed/Agility","Skill","Recovery","Plyometrics"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-field" style={{marginBottom:0}}>
          <label>Training Phase <span style={{color:"var(--gray)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional — for filtering)</span></label>
          <input className="form-input" placeholder="e.g. Pre-season Phase 1, In-season Maintenance"
            value={form.phase||""} onChange={e=>setForm(f=>({...f,phase:e.target.value}))}/>
        </div>
        <div className="form-field" style={{marginBottom:0}}>
          <label>Coach's Note <span style={{color:"var(--gray)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(shown to athletes)</span></label>
          <textarea className="form-input" rows={3} placeholder="e.g. Focus on depth today. Work up to a tough set of 3, then back off weight." value={form.coachNote} onChange={e=>setForm(f=>({...f,coachNote:e.target.value}))} style={{resize:"vertical"}}/>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
        <div className="section-title" style={{margin:0}}>Exercises</div>
      </div>

      {(form.blocks||[]).length>0 && (
        <div style={{marginBottom:"1rem"}}>
          {(form.blocks||[]).map((blk,i)=>{
            const ex=library.find(e=>e.id===blk.exerciseId);
            const isGrouped = blk.groupWithNext || (i>0 && form.blocks[i-1]?.groupWithNext);
            return (
              <div key={i} style={{
                background:isGrouped?"rgba(232,184,75,.04)":"var(--navy-light)",
                border:`1px solid ${blk.groupWithNext?"var(--gold)":isGrouped?"rgba(232,184,75,.3)":"var(--border)"}`,
                borderRadius:10, marginBottom:".5rem", overflow:"hidden"
              }}>
                {/* Header row: label + exercise name + controls */}
                <div style={{display:"flex",alignItems:"center",gap:".5rem",padding:".6rem .875rem",borderBottom:"1px solid var(--border)"}}>
                  {/* Auto-label badge */}
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:"1rem",
                    color:isGrouped?"var(--gold)":"var(--white)",
                    width:32,height:32,border:`2px solid ${isGrouped?"var(--gold)":"var(--border)"}`,
                    borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {blk.label||"?"}
                  </div>
                  {/* Exercise name */}
                  <div style={{flex:1,fontSize:".9rem",fontWeight:600,color:"var(--white)",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {ex?.name||"—"}
                  </div>
                  {/* Reorder */}
                  <div style={{display:"flex",gap:1,flexShrink:0}}>
                    <button style={{background:"transparent",border:"none",color:"var(--gray)",cursor:"pointer",fontSize:".8rem",padding:"3px 5px"}}
                      onClick={()=>setForm(f=>{if(i===0)return f;const b=[...f.blocks];[b[i-1],b[i]]=[b[i],b[i-1]];return{...f,blocks:applyLabels(b)};})}>▲</button>
                    <button style={{background:"transparent",border:"none",color:"var(--gray)",cursor:"pointer",fontSize:".8rem",padding:"3px 5px"}}
                      onClick={()=>setForm(f=>{if(i===(f.blocks||[]).length-1)return f;const b=[...f.blocks];[b[i],b[i+1]]=[b[i+1],b[i]];return{...f,blocks:applyLabels(b)};})}>▼</button>
                  </div>
                  {/* Delete */}
                  <button className="danger-btn" style={{flexShrink:0}} onClick={()=>removeBlock(i)}>✕</button>
                </div>
                {/* Sets/Reps row */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",padding:".6rem .875rem",borderBottom:"1px solid var(--border)"}}>
                  <div>
                    <div style={{fontSize:".6rem",color:"var(--gray)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:".25rem"}}>Sets</div>
                    <input className="form-input" type="number" min={1} max={20} value={blk.sets}
                      onChange={e=>updateBlock(i,"sets",parseInt(e.target.value)||1)} style={{textAlign:"center"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:".6rem",color:"var(--gray)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:".25rem"}}>Reps</div>
                    <input className="form-input" value={blk.reps}
                      onChange={e=>updateBlock(i,"reps",e.target.value)} placeholder="e.g. 5,3,1" style={{textAlign:"center"}}/>
                  </div>
                </div>
                {/* Optional fields + Group toggle */}
                <div style={{padding:".6rem .875rem"}}>
                  <input className="form-input" placeholder="% of 1RM — e.g. 70,75,80" value={blk.pcts||""}
                    onChange={e=>updateBlock(i,"pcts",e.target.value)} style={{marginBottom:".4rem",fontSize:".85rem"}}/>
                  <input className="form-input" placeholder="Coach note…" value={blk.notes}
                    onChange={e=>updateBlock(i,"notes",e.target.value)} style={{marginBottom:".5rem",fontSize:".85rem"}}/>
                  {/* Group with next toggle — only show if there's a next block */}
                  {i < (form.blocks||[]).length - 1 && (
                    <button
                      onClick={()=>updateBlock(i,"groupWithNext",!blk.groupWithNext)}
                      style={{
                        background:blk.groupWithNext?"rgba(232,184,75,.15)":"transparent",
                        border:`1px solid ${blk.groupWithNext?"var(--gold)":"var(--border)"}`,
                        color:blk.groupWithNext?"var(--gold)":"var(--gray)",
                        borderRadius:6,padding:".3rem .75rem",cursor:"pointer",
                        fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".8rem",
                        letterSpacing:".04em",transition:"all .15s",display:"flex",alignItems:"center",gap:".4rem"
                      }}>
                      <span>⚡</span>
                      {blk.groupWithNext ? "Grouped with next ✓" : "Group with next (superset)"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment section */}
      <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:10,padding:"1rem",marginBottom:"1rem"}}>
        <div style={{fontSize:".75rem",color:"var(--gold)",letterSpacing:".08em",textTransform:"uppercase",fontWeight:600,marginBottom:".75rem"}}>
          Assign To
        </div>
        <div style={{display:"flex",gap:".5rem",marginBottom:".875rem"}}>
          {[["all","Everyone"],["groups","Groups"],["players","Specific Players"]].map(([t,l])=>(
            <button key={t} onClick={()=>setForm(f=>({...f,assignedTo:{...(f.assignedTo||{}),type:t}}))}
              style={{flex:1,padding:".4rem .25rem",borderRadius:6,border:"none",cursor:"pointer",
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".8rem",
                background:(form.assignedTo?.type||"all")===t?"var(--gold)":"var(--navy)",
                color:(form.assignedTo?.type||"all")===t?"var(--navy)":"var(--gray)",transition:"all .15s"}}>
              {l}
            </button>
          ))}
        </div>
        {(form.assignedTo?.type||"all")==="groups" && (
          <div style={{display:"flex",flexWrap:"wrap",gap:".4rem"}}>
            {!(groups||[]).length
              ? <div style={{fontSize:".8rem",color:"var(--gray)"}}>No groups yet — create them in the Groups tab first.</div>
              : (groups||[]).map(g=>{
                  const sel=(form.assignedTo?.groupIds||[]).includes(g.id);
                  return (
                    <button key={g.id} onClick={()=>setForm(f=>{
                      const ids=f.assignedTo?.groupIds||[];
                      return {...f,assignedTo:{...f.assignedTo,groupIds:sel?ids.filter(x=>x!==g.id):[...ids,g.id]}};
                    })} style={{padding:".3rem .75rem",borderRadius:20,cursor:"pointer",
                      fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".8rem",
                      background:sel?"var(--gold)":"transparent",color:sel?"var(--navy)":"var(--gray)",
                      border:`1px solid ${sel?"var(--gold)":"var(--border)"}`,transition:"all .15s"}}>
                      {g.name} ({g.athleteIds?.length||0})
                    </button>
                  );
                })}
          </div>
        )}
        {(form.assignedTo?.type)==="players" && (
          <div style={{display:"flex",flexWrap:"wrap",gap:".4rem"}}>
            {(athletes||[]).map(a=>{
              const sel=(form.assignedTo?.playerIds||[]).includes(a.id);
              return (
                <button key={a.id} onClick={()=>setForm(f=>{
                  const ids=f.assignedTo?.playerIds||[];
                  return {...f,assignedTo:{...f.assignedTo,playerIds:sel?ids.filter(x=>x!==a.id):[...ids,a.id]}};
                })} style={{padding:".3rem .75rem",borderRadius:20,cursor:"pointer",
                  fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".8rem",
                  background:sel?"var(--gold)":"transparent",color:sel?"var(--navy)":"var(--gray)",
                  border:`1px solid ${sel?"var(--gold)":"var(--border)"}`,transition:"all .15s"}}>
                  #{a.number} {a.name?.split(" ")[0]}
                </button>
              );
            })}
          </div>
        )}
        {!(form.assignedTo?.type) || form.assignedTo?.type==="all" ? (
          <div style={{fontSize:".8rem",color:"var(--gray)"}}>All players will see this workout.</div>
        ) : null}
      </div>

      <div style={{display:"flex",gap:".75rem",flexWrap:"wrap"}}>
        <button className="ghost-btn" onClick={()=>setShowPicker(true)}>+ Add Exercise</button>
        {(routines||[]).length > 0 && (
          <button className="ghost-btn" onClick={()=>setShowRoutinePicker(true)}
            style={{borderColor:"var(--gold)",color:"var(--gold)"}}>
            ⚡ Insert Routine
          </button>
        )}
      </div>

      <div style={{marginTop:"1.5rem",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
        <button className="gold-btn" onClick={save}>Save Workout</button>
        {dayWorkout && <button className="back-btn" style={{color:"var(--danger)",borderColor:"var(--danger)"}} onClick={deleteWorkout}>Delete</button>}
      </div>

      {showPicker && <ExercisePicker library={library} setLibrary={setLibrary} onSelect={addBlock} onClose={()=>setShowPicker(false)}/>}

      {showRoutinePicker && (
        <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)"}}
            onClick={()=>setShowRoutinePicker(false)}/>
          <div style={{position:"relative",background:"var(--navy-mid)",borderRadius:"16px 16px 0 0",
            maxHeight:"75vh",display:"flex",flexDirection:"column",boxShadow:"0 -8px 40px rgba(0,0,0,.5)"}}>
            <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid var(--border)",flexShrink:0}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:"1.1rem"}}>
                Insert Routine
              </div>
              <div style={{fontSize:".75rem",color:"var(--gray)",marginTop:".15rem"}}>
                Choose where to insert — top (warmup) or bottom (core/stretch)
              </div>
            </div>
            <div style={{overflowY:"auto",flex:1,padding:"1rem"}}>
              {(routines||[]).map((routine, ri) => {
                const exNames = (routine.blocks||[]).map(b=>{
                  const ex = library.find(e=>e.id===b.exerciseId);
                  return ex?.name || "?";
                }).join(", ");
                return (
                  <div key={ri} style={{background:"var(--navy-light)",border:"1px solid var(--border)",
                    borderRadius:12,padding:"1rem",marginBottom:".75rem"}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                      fontSize:"1.1rem",marginBottom:".3rem"}}>{routine.name}</div>
                    <div style={{fontSize:".75rem",color:"var(--gray)",marginBottom:".875rem",lineHeight:1.5}}>
                      {routine.blocks?.length} exercises · {exNames}
                    </div>
                    <div style={{display:"flex",gap:".75rem"}}>
                      <button className="gold-btn" style={{flex:1,padding:".5rem",fontSize:".85rem"}}
                        onClick={()=>{
                          // Insert at TOP — before existing blocks, relabel all
                          const routineBlocks = (routine.blocks||[]).map(b=>({...b}));
                          setForm(f=>{
                            const combined = [...routineBlocks, ...(f.blocks||[])];
                            return {...f, blocks:applyLabels(combined)};
                          });
                          setShowRoutinePicker(false);
                        }}>
                        ↑ Add to Top
                      </button>
                      <button className="gold-btn" style={{flex:1,padding:".5rem",fontSize:".85rem"}}
                        onClick={()=>{
                          // Insert at BOTTOM — after existing blocks
                          setForm(f=>{
                            const routineBlocks2 = (routine.blocks||[]).map(b=>({...b}));
                            const combined2 = [...(f.blocks||[]), ...routineBlocks2];
                            return {...f, blocks:applyLabels(combined2)};
                          });
                          setShowRoutinePicker(false);
                        }}>
                        ↓ Add to Bottom
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (copyMode) {
    const original = scheduled.find(s=>s.date===selDate);

    const toggleBulkDate = (d) => setBulkDates(prev =>
      prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d]
    );

    // Generate next N weeks of the same weekday starting from a date
    const genWeeklyDates = (startDate, weeks) => {
      const dates = [];
      const base = new Date(startDate + "T12:00:00");
      for (let i=0; i<weeks; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + (i * 7));
        dates.push(d.toLocaleDateString("en-CA"));
      }
      return dates;
    };

    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
          <div>
            <div className="section-title" style={{margin:0}}>Copy Workout</div>
            <div style={{fontSize:".8rem",color:"var(--gray)",marginTop:".2rem"}}>
              Copying: <span style={{color:"var(--gold)"}}>{original?.title}</span>
            </div>
          </div>
          <button className="back-btn" onClick={()=>{ setCopyMode(false); setBulkMode(false); setBulkDates([]); setCopyTarget(""); }}>← Cancel</button>
        </div>

        {/* Mode toggle */}
        <div style={{display:"flex",gap:".5rem",background:"var(--navy-light)",
          borderRadius:8,padding:".3rem",marginBottom:"1.25rem"}}>
          {[["single","One Date"],["repeat","Repeat Weekly"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setBulkMode(m==="repeat"); setBulkDates([]); setCopyTarget("");}}
              style={{flex:1,padding:".4rem",borderRadius:6,border:"none",cursor:"pointer",
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".9rem",
                background:bulkMode===(m==="repeat")?"var(--gold)":"transparent",
                color:bulkMode===(m==="repeat")?"var(--navy)":"var(--gray)",
                transition:"all .15s"}}>
              {l}
            </button>
          ))}
        </div>

        {!bulkMode ? (
          <>
            <div className="form-field">
              <label>Copy to date</label>
              <input className="form-input" type="date" value={copyTarget}
                onChange={e=>setCopyTarget(e.target.value)} />
            </div>
            {copyTarget && scheduled.some(s=>s.date===copyTarget) && (
              <div style={{background:"rgba(231,76,60,.1)",border:"1px solid var(--danger)",borderRadius:8,
                padding:".75rem 1rem",marginBottom:"1rem",fontSize:".85rem",color:"var(--danger)"}}>
                ⚠️ A workout already exists on that date — saving will replace it.
              </div>
            )}
            <button className="gold-btn" disabled={!copyTarget} onClick={()=>{
              if (!original || !copyTarget) return;
              const copy = { ...original, id:`sw${Date.now()}`, date:copyTarget };
              setScheduled(prev=>[...prev.filter(w=>w.date!==copyTarget), copy]);
              setCopyMode(false); setSelDate(copyTarget); setCopyTarget("");
            }}>Copy to {copyTarget
              ? new Date(copyTarget+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})
              : "selected date"}</button>
          </>
        ) : (
          <>
            <div className="form-field">
              <label>Starting date</label>
              <input className="form-input" type="date" value={copyTarget}
                onChange={e=>{
                  setCopyTarget(e.target.value);
                  if(e.target.value) setBulkDates(genWeeklyDates(e.target.value, 4));
                }} />
            </div>
            {copyTarget && (
              <>
                <div style={{fontSize:".8rem",color:"var(--gray)",marginBottom:".75rem"}}>
                  Select which dates to copy to:
                </div>
                {genWeeklyDates(copyTarget, 8).map((d,i)=>{
                  const exists = scheduled.some(s=>s.date===d);
                  const selected = bulkDates.includes(d);
                  return (
                    <div key={d} onClick={()=>toggleBulkDate(d)}
                      style={{display:"flex",alignItems:"center",gap:".75rem",padding:".6rem .875rem",
                        marginBottom:".4rem",borderRadius:8,cursor:"pointer",
                        background:selected?"rgba(232,184,75,.08)":"var(--navy-light)",
                        border:`1px solid ${selected?"var(--gold)":"var(--border)"}`}}>
                      <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${selected?"var(--gold)":"var(--border)"}`,
                        background:selected?"var(--gold)":"transparent",flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:".7rem",color:"var(--navy)",fontWeight:900}}>
                        {selected?"✓":""}
                      </div>
                      <span style={{flex:1,fontSize:".9rem"}}>
                        {new Date(d+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"})}
                      </span>
                      {exists && <span style={{fontSize:".7rem",color:"var(--danger)"}}>⚠️ exists</span>}
                    </div>
                  );
                })}
                <div style={{marginTop:"1rem",display:"flex",gap:".75rem",flexWrap:"wrap",alignItems:"center"}}>
                  <button className="gold-btn" disabled={!bulkDates.length} onClick={()=>{
                    if(!original||!bulkDates.length)return;
                    const copies = bulkDates.map((d,i)=>({...original, id:`sw${Date.now()+i}`, date:d}));
                    setScheduled(prev=>{
                      const without=prev.filter(w=>!bulkDates.includes(w.date));
                      return [...without,...copies];
                    });
                    setCopyMode(false);
                    setSelDate(bulkDates[0]||selDate);
                  }}>
                    Copy to {bulkDates.length} date{bulkDates.length!==1?"s":""}
                  </button>
                  <button className="back-btn" onClick={()=>setBulkDates(
                    genWeeklyDates(copyTarget, 8).filter(d=>!scheduled.some(s=>s.date===d))
                  )}>Select open days</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // Exercise search — find all workouts containing this exercise
  const exSearchResults = exSearch.trim().length > 1
    ? scheduled.filter(w => (w.blocks||[]).some(b => {
        const ex = library.find(e => e.id === b.exerciseId);
        return ex?.name?.toLowerCase().includes(exSearch.toLowerCase());
      })).sort((a,b) => b.date.localeCompare(a.date)).slice(0, 20)
    : [];

  return (
    <div>
      {/* Exercise search */}
      <div style={{marginBottom:"1rem"}}>
        <input className="form-input"
          placeholder="🔍 Search workouts by exercise…"
          value={exSearch}
          onChange={e=>setExSearch(e.target.value)}/>
        {exSearch.trim().length > 1 && (
          <div style={{marginTop:".5rem"}}>
            {exSearchResults.length === 0 ? (
              <div style={{fontSize:".85rem",color:"var(--gray)",padding:".5rem 0"}}>
                No workouts found containing "{exSearch}"
              </div>
            ) : (
              <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",
                borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:".5rem .875rem",borderBottom:"1px solid var(--border)",
                  fontSize:".7rem",color:"var(--gray)",letterSpacing:".08em",textTransform:"uppercase"}}>
                  {exSearchResults.length} workout{exSearchResults.length!==1?"s":""} with "{exSearch}"
                </div>
                {exSearchResults.map((w,i)=>{
                  const matchingBlocks=(w.blocks||[]).filter(b=>{
                    const ex=library.find(e=>e.id===b.exerciseId);
                    return ex?.name?.toLowerCase().includes(exSearch.toLowerCase());
                  });
                  return (
                    <div key={w.id}
                      onClick={()=>{ setSelDate(w.date); setExSearch(""); }}
                      style={{padding:".75rem .875rem",cursor:"pointer",
                        borderBottom:i<exSearchResults.length-1?"1px solid var(--bs)":"none",
                        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:600,fontSize:".875rem"}}>{w.title}</div>
                        <div style={{fontSize:".75rem",color:"var(--gray)",marginTop:".1rem"}}>
                          {fmtDate(w.date)} · {matchingBlocks.map(b=>{
                            const ex=library.find(e=>e.id===b.exerciseId);
                            return `${b.label} ${ex?.name}`;
                          }).join(", ")}
                        </div>
                      </div>
                      <span style={{color:"var(--gold)",fontSize:".9rem"}}>›</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <WeekCalendar selectedDate={selDate} onSelectDate={setSelDate} scheduled={scheduled} allowFuture={true}/>

      <div style={{marginTop:"1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
          <div>
            <div style={{fontSize:".75rem",color:"var(--gold)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".2rem"}}>
              {selDate===TODAY?"Today ·":""} {fmtDate(selDate)}
            </div>
            {dayWorkout
              ? <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.5rem",fontWeight:700}}>{dayWorkout.title}</div>
              : <div style={{color:"var(--gray)",fontSize:".9rem"}}>No workout scheduled</div>}
          </div>
          <div style={{display:"flex",gap:".5rem"}}>
            {dayWorkout && (
              <button className="back-btn" title="Copy to another date"
                onClick={()=>{ setCopyMode(true); setBulkMode(false); setBulkDates([]); setCopyTarget(""); }}
                style={{fontSize:".85rem"}}>
                📋 Copy
              </button>
            )}
            <button className="gold-btn" onClick={openNew}>
              + {dayWorkouts.length>0?"Add Workout":"Create Workout"}
            </button>
          </div>
        </div>

        {/* Multiple workouts for this day */}
        {dayWorkouts.length===0 && (
          <div style={{textAlign:"center",padding:"2rem",color:"var(--gray)",
            background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12}}>
            No workout scheduled. Tap "+ Create Workout" to add one.
          </div>
        )}
        {dayWorkouts.map((w,wi)=>{
          const assignLabel = !w.assignedTo || w.assignedTo.type==="all" ? "Everyone" :
            w.assignedTo.type==="groups"
              ? (w.assignedTo.groupIds||[]).map(gid=>(groups||[]).find(g=>g.id===gid)?.name).filter(Boolean).join(", ")||"Groups"
              : w.assignedTo.type==="players"
              ? `${(w.assignedTo.playerIds||[]).length} player${(w.assignedTo.playerIds||[]).length!==1?"s":""}`
              : "Everyone";
          return (
            <div key={w.id} style={{background:"var(--navy-light)",border:"1px solid var(--border)",
              borderRadius:12,overflow:"hidden",marginBottom:"1rem"}}>
              {/* Workout header */}
              <div style={{padding:".875rem 1rem",borderBottom:"1px solid var(--border)",
                display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:".5rem"}}>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                    fontSize:"1.1rem",color:"var(--white)"}}>{w.title}</div>
                  <div style={{display:"flex",gap:".5rem",marginTop:".2rem",flexWrap:"wrap"}}>
                    <span style={{fontSize:".7rem",background:"var(--navy)",border:"1px solid var(--border)",
                      borderRadius:5,padding:".1rem .45rem",color:"var(--gray)"}}>{w.type||"Strength"}</span>
                    {w.phase && <span style={{fontSize:".7rem",background:"rgba(139,92,246,.15)",color:"#a78bfa",
                      border:"1px solid rgba(139,92,246,.3)",borderRadius:5,padding:".1rem .45rem",
                      fontWeight:600}}>{w.phase}</span>}
                    <span style={{fontSize:".7rem",background:w.assignedTo?.type==="all"||!w.assignedTo
                      ?"rgba(46,204,113,.1)":"rgba(232,184,75,.1)",
                      color:w.assignedTo?.type==="all"||!w.assignedTo?"var(--success)":"var(--gold)",
                      border:`1px solid ${w.assignedTo?.type==="all"||!w.assignedTo?"rgba(46,204,113,.3)":"rgba(232,184,75,.3)"}`,
                      borderRadius:5,padding:".1rem .45rem",fontWeight:600}}>
                      👥 {assignLabel}
                    </span>
                  </div>
                </div>
                <div style={{display:"flex",gap:".5rem"}}>
                  <button className="back-btn" style={{fontSize:".8rem"}} onClick={()=>openEdit(w)}>Edit</button>
                  <button className="back-btn" style={{fontSize:".8rem",color:"var(--danger)",borderColor:"var(--danger)"}}
                    onClick={()=>setScheduled(prev=>prev.filter(x=>x.id!==w.id))}>Delete</button>
                </div>
              </div>
              {/* Exercise list */}
              {(w.blocks||[]).map((blk,i)=>{
                const ex=library.find(e=>e.id===blk.exerciseId);
                return (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:".6rem 1rem",borderBottom:"1px solid var(--bs)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                        color:"var(--gold)",width:24,fontSize:".85rem"}}>{blk.label}</div>
                      <div>
                        <div style={{fontSize:".875rem",fontWeight:500}}>{ex?.name||"Unknown"}</div>
                        {blk.notes && <div style={{fontSize:".72rem",color:"var(--gray)"}}>{blk.notes}</div>}
                      </div>
                    </div>
                    <div style={{color:"var(--gold)",fontFamily:"'Barlow Condensed',sans-serif",
                      fontSize:".9rem",fontWeight:700,whiteSpace:"nowrap"}}>{blk.sets}×{blk.reps}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EXERCISE PICKER ──────────────────────────────────────────────────────────
function ExercisePicker({ library, setLibrary, onSelect, onClose }) {
  const [search,setSearch]=useState("");
  const [catFilter,setCatFilter]=useState("All");
  const [adding,setAdding]=useState(false);
  const [newEx,setNewEx]=useState({name:"",category:"Lower Body",unit:"lb",videoUrl:""});
  const [flash,setFlash]=useState(null);

  const allCats=[...new Set(library.map(e=>e.category))].sort();
  const filtered=library.filter(e=>{
    const matchS = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const matchC = catFilter==="All" || e.category===catFilter;
    return matchS && matchC;
  });
  const categories=[...new Set(filtered.map(e=>e.category))].sort();

  const openAdd=()=>{ setNewEx(f=>({...f,name:search})); setAdding(true); };
  const saveAndSelect=()=>{
    if(!newEx.name.trim())return;
    const ex={id:`ex${Date.now()}`,...newEx};
    setLibrary(prev=>[...prev,ex]);
    setFlash(ex.name);
    setAdding(false); setSearch("");
    setNewEx({name:"",category:"Lower Body",unit:"lb",videoUrl:""});
    setTimeout(()=>{ setFlash(null); onSelect(ex); },900);
  };

  return (
    <div className="picker-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="picker-sheet">
        {flash && (
          <div style={{position:"absolute",top:0,left:0,right:0,background:"var(--success)",color:"#fff",
            padding:".75rem 1.5rem",textAlign:"center",zIndex:10,
            fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",fontWeight:700,
            borderRadius:"20px 20px 0 0",letterSpacing:".05em"}}>
            ✓ "{flash}" added — inserting into workout…
          </div>
        )}
        <div className="picker-header">
          <div className="picker-title">{adding?"New Exercise":"Pick Exercise"}</div>
          <button className="picker-close" onClick={()=>adding?setAdding(false):onClose()}>{adding?"← Back":"✕"}</button>
        </div>
        {adding ? (
          <div style={{padding:"1.25rem 1.5rem",overflowY:"auto",flex:1}}>
            <div className="form-field">
              <label>Exercise Name</label>
              <input className="form-input" autoFocus placeholder="e.g. Hex Bar Jump" value={newEx.name} onChange={e=>setNewEx(f=>({...f,name:e.target.value}))}/>
            </div>
            <div className="form-row">
              <div className="form-field" style={{marginBottom:0}}>
                <label>Category</label>
                <select className="form-input" value={newEx.category} onChange={e=>setNewEx(f=>({...f,category:e.target.value}))}>
                  {["Lower Body","Upper Body","Core","Plyometrics","Speed/Agility","Warmup","Conditioning","Mobility","Other"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-field" style={{marginBottom:0}}>
                <label>Unit</label>
                <select className="form-input" value={newEx.unit} onChange={e=>setNewEx(f=>({...f,unit:e.target.value}))}>
                  {["lb","sec","yds","m",""].map(u=><option key={u} value={u}>{u||"none"}</option>)}
                </select>
              </div>
            </div>
            <div className="form-field" style={{marginTop:".75rem"}}>
              <label>YouTube Link <span style={{color:"var(--gray)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
              <input className="form-input" placeholder="https://youtube.com/watch?v=..." value={newEx.videoUrl} onChange={e=>setNewEx(f=>({...f,videoUrl:e.target.value}))}/>
            </div>
            <button className="gold-btn" style={{width:"100%",marginTop:"1.25rem",padding:".875rem",fontSize:"1rem"}} onClick={saveAndSelect}>
              Add to Library &amp; Insert into Workout
            </button>
          </div>
        ) : (
          <>
            <div className="picker-search">
              <input autoFocus placeholder="Search exercises…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {/* Category filter chips */}
            <div style={{display:"flex",gap:".4rem",padding:".5rem 1rem .25rem",overflowX:"auto",flexShrink:0}}>
              {["All",...allCats].map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)}
                  style={{flexShrink:0,background:catFilter===c?"var(--gold)":"transparent",
                    color:catFilter===c?"var(--navy)":"var(--gray)",
                    border:catFilter===c?"1px solid var(--gold)":"1px solid var(--border)",
                    borderRadius:20,padding:".25rem .75rem",cursor:"pointer",
                    fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                    fontSize:".75rem",letterSpacing:".04em",whiteSpace:"nowrap"}}>
                  {c}
                </button>
              ))}
            </div>
            <div className="picker-list">
              {categories.map(cat=>(
                <div key={cat}>
                  <div className="picker-cat">{cat}</div>
                  {filtered.filter(e=>e.category===cat).map(ex=>(
                    <div key={ex.id} className="picker-item" onClick={()=>onSelect(ex)}>
                      <span className="picker-item-name">{ex.name}</span>
                      <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
                        {ex.videoUrl&&<span style={{fontSize:".65rem",color:"#ff4444",fontWeight:700}}>▶</span>}
                        <span className="picker-item-unit">{ex.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{padding:"1.25rem 1.5rem",borderTop:filtered.length?"1px solid var(--bs)":"none"}}>
                {filtered.length===0 && <div style={{color:"var(--gray)",fontSize:".9rem",marginBottom:"1rem",textAlign:"center"}}>{search?`No results for "${search}"`:"No exercises yet"}</div>}
                <button onClick={openAdd} style={{width:"100%",background:"transparent",border:"1px dashed var(--gold-dim)",
                  color:"var(--gold)",borderRadius:10,padding:".875rem",cursor:"pointer",
                  fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",fontWeight:700,
                  letterSpacing:".05em",textTransform:"uppercase",transition:"all .2s"}}>
                  + Add New Exercise to Library
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── EXERCISE LIBRARY TAB ─────────────────────────────────────────────────────
function LibraryTab({ library, setLibrary }) {
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:"",category:"Lower Body",unit:"lb",videoUrl:"",substituteId:""});
  const [editingId,setEditingId]=useState(null);
  const [editForm,setEditForm]=useState(null);
  const [search,setSearch]=useState("");
  const [catFilter,setCatFilter]=useState("All");

  const addEx=()=>{ if(!form.name.trim())return; setLibrary(prev=>[...prev,{id:`ex${Date.now()}`,...form}]); setForm({name:"",category:"Lower Body",unit:"lb",videoUrl:"",substituteId:""}); setShowAdd(false); };
  const removeEx=(id)=>{ setLibrary(prev=>prev.filter(e=>e.id!==id)); dbDelete("library",id).catch(e=>console.error("removeEx:",e)); };
  const allCategories=[...new Set(library.map(e=>e.category))].sort();
  const filteredLibrary = library.filter(e=>{
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter==="All" || e.category===catFilter;
    return matchSearch && matchCat;
  });
  const categories=[...new Set(filteredLibrary.map(e=>e.category))].sort();

  return (
    <div>
      <div className="lib-header">
        <div className="section-title" style={{margin:0}}>Exercise Library</div>
        <button className="gold-btn" onClick={()=>setShowAdd(v=>!v)}>{showAdd?"Cancel":"+ Add Exercise"}</button>
      </div>
      {/* Search + filter bar */}
      {!showAdd && (
        <div style={{marginBottom:"1.25rem",display:"flex",gap:".75rem",flexWrap:"wrap"}}>
          <input
            className="form-input"
            placeholder="🔍 Search exercises…"
            value={search}
            onChange={e=>{setSearch(e.target.value);setEditingId(null);}}
            style={{flex:1,minWidth:160}}
          />
          <select className="form-input" value={catFilter}
            onChange={e=>{setCatFilter(e.target.value);setEditingId(null);}}
            style={{minWidth:140}}>
            <option value="All">All categories</option>
            {allCategories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          {(search||catFilter!=="All") && (
            <button className="back-btn" onClick={()=>{setSearch("");setCatFilter("All");}}
              style={{whiteSpace:"nowrap"}}>
              Clear
            </button>
          )}
        </div>
      )}
      {!showAdd && filteredLibrary.length===0 && (
        <div style={{textAlign:"center",padding:"1.5rem",color:"var(--gray)",
          background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12}}>
          No exercises match "{search}"
          {catFilter!=="All" ? ` in ${catFilter}` : ""}.
        </div>
      )}
      {showAdd && (
        <div className="builder-form">
          <div className="form-row">
            <div className="form-field"><label>Name</label><input className="form-input" placeholder="e.g. Hex Bar Jump" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="form-field"><label>Unit</label>
              <select className="form-input" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>
                {["lb","sec","yds","m",""].map(u=><option key={u} value={u}>{u||"none (bodyweight/count)"}</option>)}
              </select>
            </div>
          </div>
          <div className="form-field"><label>Category</label>
            <select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              {["Lower Body","Upper Body","Core","Plyometrics","Speed/Agility","Warmup","Conditioning","Mobility","Other"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>YouTube Link <span style={{color:"var(--gray)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
            <input className="form-input" placeholder="https://youtube.com/watch?v=..." value={form.videoUrl} onChange={e=>setForm(f=>({...f,videoUrl:e.target.value}))}/>
          </div>
          <div className="form-field">
            <label>Recommended Substitute <span style={{color:"var(--gray)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional — shown if equipment unavailable)</span></label>
            <select className="form-input" value={form.substituteId} onChange={e=>setForm(f=>({...f,substituteId:e.target.value}))}>
              <option value="">— No substitute —</option>
              {library.map(e2=>(
                <option key={e2.id} value={e2.id}>{e2.name}</option>
              ))}
            </select>
          </div>
          <button className="gold-btn" onClick={addEx}>Add to Library</button>
        </div>
      )}
      {categories.map(cat=>(
        <div key={cat} style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12,marginBottom:"1rem",overflow:"hidden"}}>
          <div style={{padding:".75rem 1rem",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:"var(--gold)",letterSpacing:".05em"}}>{cat.toUpperCase()}</span>
            <span style={{fontSize:".8rem",color:"var(--gray)"}}>{filteredLibrary.filter(e=>e.category===cat).length}</span>
          </div>
          {filteredLibrary.filter(e=>e.category===cat).map(ex=>(
            <div key={ex.id}>
              {editingId===ex.id&&editForm ? (
                <div style={{padding:"1rem",borderBottom:"1px solid var(--bs)",background:"rgba(232,184,75,.05)"}}>
                  <div className="form-row" style={{marginBottom:".5rem"}}>
                    <div className="form-field" style={{marginBottom:0}}><label>Name</label><input className="form-input" value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/></div>
                    <div className="form-field" style={{marginBottom:0}}><label>Unit</label>
                      <select className="form-input" value={editForm.unit} onChange={e=>setEditForm(f=>({...f,unit:e.target.value}))}>
                        {["lb","sec","yds","m",""].map(u=><option key={u} value={u}>{u||"none"}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-field" style={{marginBottom:".75rem"}}><label>YouTube Link</label>
                    <input className="form-input" placeholder="https://youtube.com/watch?v=..." value={editForm.videoUrl||""} onChange={e=>setEditForm(f=>({...f,videoUrl:e.target.value}))}/>
                  </div>
                  <div className="form-field" style={{marginBottom:".75rem"}}>
                    <label>Recommended Substitute <span style={{color:"var(--gray)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(shown if equipment unavailable)</span></label>
                    <select className="form-input" value={editForm.substituteId||""} onChange={e=>setEditForm(f=>({...f,substituteId:e.target.value}))}>
                      <option value="">— No substitute set —</option>
                      {library.filter(e2=>e2.id!==ex.id).map(e2=>(
                        <option key={e2.id} value={e2.id}>{e2.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{display:"flex",gap:".75rem"}}>
                    <button className="gold-btn" style={{padding:".5rem 1.25rem",fontSize:".85rem"}}
                      onClick={()=>{ setLibrary(prev=>prev.map(e=>e.id===ex.id?{...e,...editForm}:e)); setEditingId(null); }}>Save</button>
                    <button className="back-btn" onClick={()=>setEditingId(null)}>Cancel</button>
                    <button className="back-btn" style={{marginLeft:"auto",color:"var(--danger)",borderColor:"var(--danger)"}} onClick={()=>{ removeEx(ex.id); setEditingId(null); }}>Remove</button>
                  </div>
                </div>
              ) : (
                <div className="lib-item" onClick={()=>{ setEditingId(ex.id); setEditForm({name:ex.name,unit:ex.unit||"",category:ex.category,videoUrl:ex.videoUrl||"",substituteId:ex.substituteId||""}); }}>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="lib-item-name">{ex.name}</div>
                    <div style={{display:"flex",gap:".75rem",alignItems:"center",marginTop:".2rem",flexWrap:"wrap"}}>
                      {ex.unit&&<div className="lib-item-unit">{ex.unit}</div>}
                      {ex.videoUrl&&<a href={ex.videoUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:".72rem",color:"#ff4444",fontWeight:600,textDecoration:"none",display:"flex",alignItems:"center",gap:".2rem"}}>▶ YouTube</a>}
                      {ex.substituteId && (() => {
                        const sub = library.find(e2=>e2.id===ex.substituteId);
                        return sub ? <div style={{fontSize:".72rem",color:"var(--gold)",display:"flex",alignItems:"center",gap:".2rem"}}>⇄ {sub.name}</div> : null;
                      })()}
                    </div>
                  </div>
                  <span style={{color:"var(--gray)",fontSize:".8rem",paddingLeft:".5rem"}}>Edit ›</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── PROGRESSIONS TAB ─────────────────────────────────────────────────────────
function ProgressTab({ athletes, logs, scheduled, groups }) {
  const [focus,setFocus]=useState(null);

  const exportLogs = (athletes, logs) => {
    const rows = [["Athlete","Date","Exercise","Set","Weight (lb)","Reps","Est. 1RM"]];
    [...logs].sort((a,b)=>b.date.localeCompare(a.date)).forEach(l=>{
      const ath = athletes.find(x=>x.id===l.athleteId);
      const orm = l.weight&&l.reps ? Math.round(l.weight*(1+l.reps/30)) : "";
      rows.push([ath?.name||l.athleteId, l.date, l.exerciseName, l.set, l.weight, l.reps, orm]);
    });
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="du-basketball-logs.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const [playerSearch, setPlayerSearch] = React.useState("");
  const [groupFilter,  setGroupFilter]  = React.useState("all");
  const [sortBy,       setSortBy]       = React.useState("name"); // name | volume | completion

  const filteredAthletes = athletes.filter(a => {
    const matchSearch = !playerSearch || a.name?.toLowerCase().includes(playerSearch.toLowerCase()) || String(a.number).includes(playerSearch);
    const matchGroup  = groupFilter==="all" || (groups||[]).find(g=>g.id===groupFilter)?.athleteIds?.includes(a.id);
    return matchSearch && matchGroup;
  }).sort((a,b) => {
    if (sortBy==="volume") {
      const volA = logs.filter(l=>l.athleteId===a.id&&l.weight>0).reduce((s,l)=>s+(l.weight*(l.reps||1)),0);
      const volB = logs.filter(l=>l.athleteId===b.id&&l.weight>0).reduce((s,l)=>s+(l.weight*(l.reps||1)),0);
      return volB - volA;
    }
    if (sortBy==="completion") {
      const compA = (() => {
        const dates=[...new Set(logs.filter(l=>l.athleteId===a.id).map(l=>l.date))];
        if(!dates.length)return 0;
        const rates=dates.map(d=>{const w=scheduled.find(s=>s.date===d);if(!w)return null;const p=w.blocks?.length||0;if(!p)return null;const done=new Set(logs.filter(l=>l.athleteId===a.id&&l.date===d).map(l=>l.exerciseName)).size;return done/p;}).filter(r=>r!==null);
        return rates.length?rates.reduce((s,r)=>s+r,0)/rates.length:0;
      })();
      const compB = (() => {
        const dates=[...new Set(logs.filter(l=>l.athleteId===b.id).map(l=>l.date))];
        if(!dates.length)return 0;
        const rates=dates.map(d=>{const w=scheduled.find(s=>s.date===d);if(!w)return null;const p=w.blocks?.length||0;if(!p)return null;const done=new Set(logs.filter(l=>l.athleteId===b.id&&l.date===d).map(l=>l.exerciseName)).size;return done/p;}).filter(r=>r!==null);
        return rates.length?rates.reduce((s,r)=>s+r,0)/rates.length:0;
      })();
      return compB - compA;
    }
    return (a.name||"").localeCompare(b.name||"");
  });

  const getMax=(athleteId,exerciseName)=>{
    const rel=logs.filter(l=>l.athleteId===athleteId&&l.exerciseName===exerciseName&&l.weight>0);
    if(!rel.length)return null;
    const vals=rel.map(l=>calc1RM(l.weight,l.reps) ?? ((!l.reps||l.reps===0) ? l.weight : null)).filter(Boolean);
    return vals.length ? Math.max(...vals) : null;
  };

  // Workout completion rate — how many exercises logged vs programmed per session
  const completionByAthlete = athletes.map(a => {
    const aLogs = logs.filter(l => l.athleteId === a.id);
    const logDates = [...new Set(aLogs.map(l => l.date))];
    if (!logDates.length) return { ...a, completion: null, sessions: 0 };

    const rates = logDates.map(date => {
      const workout = (scheduled||[]).find(w => w.date === date);
      if (!workout) return null;
      const programmed = (workout.blocks||[]).length;
      if (!programmed) return null;
      const logged = new Set(aLogs.filter(l=>l.date===date).map(l=>l.exerciseName)).size;
      return Math.min(logged / programmed, 1); // cap at 100%
    }).filter(r => r !== null);

    const avg = rates.length ? Math.round((rates.reduce((s,r)=>s+r,0)/rates.length)*100) : null;
    return { ...a, completion: avg, sessions: logDates.length };
  }).filter(a => a.completion !== null).sort((a,b) => b.completion - a.completion);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".875rem",flexWrap:"wrap",gap:".5rem"}}>
        <div className="section-title" style={{margin:0}}>Progressions</div>
        <button className="back-btn" style={{fontSize:".8rem"}} onClick={()=>exportLogs(athletes,logs)}>⬇ Export CSV</button>
      </div>

      {/* Search + filter bar */}
      <div style={{display:"flex",gap:".5rem",marginBottom:".875rem",flexWrap:"wrap"}}>
        <input className="form-input" placeholder="🔍 Search player…"
          value={playerSearch} onChange={e=>setPlayerSearch(e.target.value)}
          style={{flex:2,minWidth:130}}/>
        {(groups||[]).length>0 && (
          <select className="form-input" value={groupFilter} onChange={e=>setGroupFilter(e.target.value)}
            style={{flex:1,minWidth:110}}>
            <option value="all">All groups</option>
            {(groups||[]).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <select className="form-input" value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{flex:1,minWidth:110}}>
          <option value="name">Sort: Name</option>
          <option value="volume">Sort: Volume</option>
          <option value="completion">Sort: Completion</option>
        </select>
      </div>
      <div style={{fontSize:".75rem",color:"var(--gray)",marginBottom:"1rem"}}>
        {filteredAthletes.length} of {athletes.length} players
        {playerSearch && ` matching "${playerSearch}"`}
        {groupFilter!=="all" && ` in ${(groups||[]).find(g=>g.id===groupFilter)?.name}`}
      </div>

      {/* Workout completion rate section */}
      {completionByAthlete.length > 0 && (
        <div style={{marginBottom:"1.5rem"}}>
          <div className="section-title" style={{fontSize:"1rem",marginBottom:".75rem"}}>
            💯 Workout Completion Rate
          </div>
          <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
            {completionByAthlete.map((a,i)=>(
              <div key={a.id} style={{padding:".75rem 1rem",
                borderBottom:i<completionByAthlete.length-1?"1px solid var(--bs)":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:".35rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",
                      color:"var(--gray)",fontSize:".8rem"}}>#{a.number}</span>
                    <span style={{fontWeight:500,fontSize:".9rem"}}>{a.name}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
                    <span style={{fontSize:".72rem",color:"var(--gray)"}}>
                      {a.sessions} session{a.sessions!==1?"s":""}
                    </span>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",
                      fontWeight:700,fontSize:"1rem",
                      color:a.completion>=90?"var(--success)":a.completion>=70?"var(--gold)":"var(--danger)"}}>
                      {a.completion}%
                    </span>
                  </div>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{
                    width:`${a.completion}%`,
                    background:a.completion>=90?"var(--success)":a.completion>=70?"var(--gold)":"var(--danger)"
                  }}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize:".72rem",color:"var(--gray)",marginTop:".5rem",lineHeight:1.5}}>
            Exercises logged ÷ exercises programmed per session, averaged across all sessions.
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",marginBottom:"1.5rem"}}>
        <button className={`admin-tab ${!focus?"active":""}`} onClick={()=>setFocus(null)}>All</button>
        {athletes.map(a=><button key={a.id} className={`admin-tab ${focus===a.id?"active":""}`} onClick={()=>setFocus(a.id)}>#{a.number} {a.name.split(" ")[0]}</button>)}
      </div>
      {/* Phase filter */}
      {(()=>{
        const phases=[...new Set((scheduled||[]).map(w=>w.phase).filter(Boolean))];
        if(!phases.length) return null;
        return null; // Phase filter placeholder — phases available: {phases.join(", ")}
      })()}
      <div className="section-title">Max Weight Progressions (~1RM)</div>
      {filteredAthletes.filter(a=>!focus||a.id===focus).map(a=>{
        const aLogs=logs.filter(l=>l.athleteId===a.id); if(!aLogs.length)return null;
        const exercises=[...new Set(aLogs.map(l=>l.exerciseName))];
        const overallMax=Math.max(...aLogs.filter(l=>l.weight>0).map(l=>calc1RM(l.weight,l.reps)).filter(Boolean),1);
        return (
          <div key={a.id} style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12,padding:"1.25rem",marginBottom:"1rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem",flexWrap:"wrap",gap:".5rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
                <div className="athlete-number" style={{width:30,height:30,fontSize:".8rem"}}>#{a.number}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.2rem",fontWeight:700}}>{a.name}</div>
              </div>
              {a.weight && (
                <div style={{fontSize:".75rem",color:"var(--gray)",background:"var(--navy)",
                  border:"1px solid var(--border)",borderRadius:6,padding:".2rem .6rem"}}>
                  BW: {a.weight} lb
                </div>
              )}
            </div>
            {exercises.map(ex=>{
              const max1RM=getMax(a.id,ex); if(!max1RM)return null;
              const history=aLogs.filter(l=>l.exerciseName===ex&&l.weight>0).map(l=>l.weight);
              const bwNum = parseFloat(a.weight);
              const relStrength = bwNum>0 ? (max1RM/bwNum).toFixed(2) : null;
              return (
                <div key={ex} style={{marginBottom:".875rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:".85rem",flexWrap:"wrap",gap:".25rem"}}>
                    <span style={{color:"var(--gray)"}}>{ex}</span>
                    <div style={{display:"flex",gap:".75rem",alignItems:"center"}}>
                      {relStrength && (
                        <span style={{fontSize:".72rem",color:"var(--gray)"}}>
                          {relStrength}× BW
                        </span>
                      )}
                      <span style={{color:"var(--gold)",fontWeight:600}}>~{max1RM} lb 1RM</span>
                    </div>
                  </div>
                  <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{width:`${Math.round((max1RM/overallMax)*100)}%`}}/></div>
                  <div style={{fontSize:".7rem",color:"var(--gray)",marginTop:".2rem"}}>History: {history.slice(-6).join(" → ")} lb</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── ATTENDANCE TAB ───────────────────────────────────────────────────────────
function AttendanceTab({ athletes, checkins, logs, excused, saveExcused }) {
  const totalDays=Math.max([...new Set(checkins.map(c=>c.date))].length,1);
  const [excuseForm,setExcuseForm]=useState(null);
  const [excuseReason,setExcuseReason]=useState("");
  const [activeAthlete,setActiveAthlete]=useState(null);

  const isExcused=(athleteId,date)=>(excused||[]).some(e=>e.athleteId===athleteId&&e.date===date);
  const addExcuse=()=>{
    if(!excuseForm)return;
    const updated=[...(excused||[]).filter(e=>!(e.athleteId===excuseForm.athleteId&&e.date===excuseForm.date)),
      {athleteId:excuseForm.athleteId,date:excuseForm.date,reason:excuseReason.trim()||"Excused"}];
    saveExcused(updated);
    setExcuseForm(null); setExcuseReason("");
  };
  const removeExcuse=(athleteId,date)=>{
    saveExcused((excused||[]).filter(e=>!(e.athleteId===athleteId&&e.date===date)));
  };

  const exportCSV=(rows,filename)=>{
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportAttendance=()=>{
    const rows=[["Athlete","Date","Time","Workout","Status"]];
    [...checkins].sort((a,b)=>b.date.localeCompare(a.date)).forEach(c=>{
      const ath=athletes.find(x=>x.id===c.athleteId);
      rows.push([ath?.name||c.athleteId,c.date,c.time,c.workoutTitle,"Present"]);
    });
    (excused||[]).sort((a,b)=>b.date.localeCompare(a.date)).forEach(e=>{
      const ath=athletes.find(x=>x.id===e.athleteId);
      rows.push([ath?.name||e.athleteId,e.date,"—","—",`Excused: ${e.reason}`]);
    });
    exportCSV(rows,"du-basketball-attendance.csv");
  };

  // Weekly volume trend — last 8 weeks
  const weeklyVolume=(()=>{
    const weeks=[];
    for(let i=7;i>=0;i--){
      const start=new Date(); start.setDate(start.getDate()-(i*7+6));
      const end=new Date(); end.setDate(end.getDate()-(i*7));
      const startStr=start.toLocaleDateString("en-CA");
      const endStr=end.toLocaleDateString("en-CA");
      const vol=(logs||[]).filter(l=>l.date>=startStr&&l.date<=endStr&&l.weight>0)
        .reduce((sum,l)=>sum+(l.weight*(l.reps||1)),0);
      weeks.push({label:`W${8-i}`,vol:Math.round(vol)});
    }
    return weeks;
  })();
  const maxVol=Math.max(...weeklyVolume.map(w=>w.vol),1);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
        <div className="section-title" style={{margin:0}}>Attendance</div>
        <button className="back-btn" onClick={exportAttendance} style={{fontSize:".8rem"}}>⬇ Export CSV</button>
      </div>

      {maxVol>0&&(
        <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",
          borderRadius:12,padding:"1rem 1.25rem",marginBottom:"1.5rem"}}>
          <div style={{fontSize:".75rem",color:"var(--gold)",letterSpacing:".08em",
            textTransform:"uppercase",fontWeight:600,marginBottom:".75rem"}}>
            📈 Team Volume Trend — Last 8 Weeks (lbs)
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:60}}>
            {weeklyVolume.map((w,i)=>{
              const h=w.vol>0?Math.max(8,(w.vol/maxVol)*100):4;
              const cur=i===weeklyVolume.length-1;
              return(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{fontSize:".55rem",color:"var(--gray)",fontFamily:"'Barlow Condensed',sans-serif"}}>
                    {w.vol>0?`${(w.vol/1000).toFixed(0)}k`:""}
                  </div>
                  <div style={{width:"100%",borderRadius:4,minHeight:3,
                    background:cur?"var(--gold)":w.vol>0?"rgba(232,184,75,.4)":"var(--navy)",
                    height:`${h}%`,transition:"height .3s"}}/>
                  <div style={{fontSize:".6rem",color:cur?"var(--gold)":"var(--gray)"}}>{w.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="stat-grid" style={{marginBottom:"1.5rem"}}>
        <div className="stat-card"><div className="stat-num">{checkins.filter(c=>c.date===TODAY).length}</div><div className="stat-lbl">Today</div></div>
        <div className="stat-card"><div className="stat-num">{checkins.length}</div><div className="stat-lbl">Total Check-Ins</div></div>
        <div className="stat-card"><div className="stat-num">{totalDays}</div><div className="stat-lbl">Sessions</div></div>
        <div className="stat-card"><div className="stat-num">{(excused||[]).length}</div><div className="stat-lbl">Excused</div></div>
      </div>

      <div className="section-title">By Athlete</div>
      {athletes.map(a=>{
        const count=checkins.filter(c=>c.athleteId===a.id).length;
        const excusedCount=(excused||[]).filter(e=>e.athleteId===a.id).length;
        const pct=Math.min(100,Math.round((count/totalDays)*100));
        const isOpen=activeAthlete===a.id;
        return(
          <div key={a.id} style={{marginBottom:".75rem",background:"var(--navy-light)",
            border:"1px solid var(--border)",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:".75rem 1rem",cursor:"pointer",display:"flex",
              justifyContent:"space-between",alignItems:"center"}}
              onClick={()=>setActiveAthlete(isOpen?null:a.id)}>
              <span style={{fontSize:".9rem"}}>#{a.number} {a.name}</span>
              <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
                {excusedCount>0&&<span style={{fontSize:".72rem",color:"var(--gray)"}}>{excusedCount} excused</span>}
                <span style={{color:"var(--gold)",fontSize:".85rem",fontWeight:600}}>{count}/{totalDays} · {pct}%</span>
                <span style={{color:"var(--gray)",fontSize:".8rem"}}>{isOpen?"▲":"▼"}</span>
              </div>
            </div>
            <div className="progress-bar-wrap" style={{margin:"0 1rem .75rem",height:6}}>
              <div className="progress-bar-fill" style={{width:`${pct}%`}}/>
            </div>
            {isOpen&&(
              <div style={{borderTop:"1px solid var(--border)",padding:".75rem 1rem"}}>
                <div style={{fontSize:".75rem",color:"var(--gray)",marginBottom:".5rem"}}>Mark a date as excused:</div>
                <div style={{display:"flex",gap:".5rem",marginBottom:".75rem",flexWrap:"wrap"}}>
                  <input type="date"
                    value={excuseForm?.athleteId===a.id?excuseForm.date:""}
                    onChange={e=>setExcuseForm({athleteId:a.id,date:e.target.value})}
                    className="form-input" style={{flex:1,minWidth:130,fontSize:".85rem"}}/>
                  <input placeholder="Reason (optional)"
                    value={excuseForm?.athleteId===a.id?excuseReason:""}
                    onChange={e=>setExcuseReason(e.target.value)}
                    className="form-input" style={{flex:2,minWidth:130,fontSize:".85rem"}}/>
                  <button className="gold-btn"
                    disabled={!(excuseForm?.athleteId===a.id&&excuseForm.date)}
                    style={{padding:".4rem .875rem",fontSize:".85rem"}}
                    onClick={addExcuse}>Mark Excused</button>
                </div>
                {(excused||[]).filter(e=>e.athleteId===a.id).length>0&&(
                  <div>
                    <div style={{fontSize:".7rem",color:"var(--gray)",marginBottom:".4rem"}}>Excused dates:</div>
                    {(excused||[]).filter(e=>e.athleteId===a.id)
                      .sort((a,b)=>b.date.localeCompare(a.date))
                      .map((e,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",
                          alignItems:"center",padding:".3rem 0",borderBottom:"1px solid var(--bs)",fontSize:".82rem"}}>
                          <span>{fmtDate(e.date)} <span style={{color:"var(--gray)"}}>· {e.reason}</span></span>
                          <button onClick={()=>removeExcuse(e.athleteId,e.date)}
                            style={{background:"transparent",border:"none",color:"var(--danger)",
                              cursor:"pointer",fontSize:".8rem",padding:"0 .25rem"}}>✕</button>
                        </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="section-title" style={{marginTop:"2rem"}}>Full Log</div>
      <table className="data-table">
        <thead><tr><th>Athlete</th><th>Date</th><th>Time</th><th>Workout</th><th>Status</th></tr></thead>
        <tbody>
          {[...checkins].reverse().map((c,i)=>{
            const a=athletes.find(x=>x.id===c.athleteId);
            return <tr key={i}><td>{a?.name}</td><td>{fmtDate(c.date)}</td>
              <td style={{color:"var(--gold)"}}>{c.time}</td><td>{c.workoutTitle}</td>
              <td style={{color:"var(--success)",fontSize:".8rem",fontWeight:600}}>✓ Present</td></tr>;
          })}
          {[...(excused||[])].sort((a,b)=>b.date.localeCompare(a.date)).map((e,i)=>{
            const a=athletes.find(x=>x.id===e.athleteId);
            return <tr key={`ex${i}`}><td>{a?.name}</td><td>{fmtDate(e.date)}</td>
              <td style={{color:"var(--gray)"}}>—</td><td style={{color:"var(--gray)"}}>—</td>
              <td style={{color:"var(--gold)",fontSize:".8rem",fontWeight:600}}>📋 {e.reason}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── ROSTER TAB ───────────────────────────────────────────────────────────────
function RosterTab({ athletes, setAthletes }) {
  const POSITIONS = ["PG","SG","SF","PF","C","G","F","ATH"];

  const [showAdd, setShowAdd]   = useState(false);
  const [editId,  setEditId]    = useState(null);
  const [form,    setForm]      = useState({ name:"", number:"", position:"PG", year:"", height:"", weight:"" });
  const [editForm,setEditForm]  = useState(null);
  const [confirm, setConfirm]   = useState(null); // id to confirm delete

  const blank = { name:"", number:"", position:"PG", year:"", height:"", weight:"" };

  const addPlayer = () => {
    if (!form.name.trim()) return;
    setAthletes(prev => [...prev, { id:`p${Date.now()}`, ...form }]);
    setForm(blank);
    setShowAdd(false);
  };

  const saveEdit = (id) => {
    setAthletes(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, ...editForm };
      // If weight changed, append to weightLog for tracking
      if (editForm.weight && editForm.weight !== a.weight) {
        const entry = { weight: parseFloat(editForm.weight), date: TODAY };
        updated.weightLog = [...(a.weightLog||[]), entry].slice(-52); // keep 1 year
      }
      return updated;
    }));
    setEditId(null);
  };

  const removePlayer = (id) => {
    setAthletes(prev => prev.filter(a => a.id !== id)); // update local state
    dbDelete("athletes", id).catch(e => console.error("removePlayer:", e)); // delete from Supabase
    setConfirm(null);
    setEditId(null);
  };

  const fieldStyle = { marginBottom: 0 };

  return (
    <div>
      <div className="lib-header">
        <div>
          <div className="section-title" style={{ margin: 0 }}>Roster</div>
          <div style={{ fontSize: ".8rem", color: "var(--gray)", marginTop: ".2rem" }}>{athletes.length} players</div>
        </div>
        <button className="gold-btn" onClick={() => { setShowAdd(v => !v); setEditId(null); }}>
          {showAdd ? "Cancel" : "+ Add Player"}
        </button>
      </div>

      {/* Add player form */}
      {showAdd && (
        <div className="builder-form" style={{ marginBottom: "1.5rem" }}>
          <div className="form-row">
            <div className="form-field" style={fieldStyle}>
              <label>Full Name *</label>
              <input className="form-input" placeholder="Marcus Johnson" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="form-field" style={fieldStyle}>
              <label>Jersey #</label>
              <input className="form-input" placeholder="23" value={form.number}
                onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field" style={fieldStyle}>
              <label>Position</label>
              <select className="form-input" value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))}>
                {POSITIONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-field" style={fieldStyle}>
              <label>Year</label>
              <select className="form-input" value={form.year}
                onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                <option value="">—</option>
                {["Fr","So","Jr","Sr","Grad","RS Fr","RS So","RS Jr","RS Sr"].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field" style={fieldStyle}>
              <label>Height</label>
              <input className="form-input" placeholder="e.g. 6ft 4in" value={form.height}
                onChange={e => setForm(f => ({ ...f, height: e.target.value }))} />
            </div>
            <div className="form-field" style={fieldStyle}>
              <label>Weight (lbs)</label>
              <input className="form-input" placeholder="195" value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
          </div>
          <div className="form-field">
            <label>Player PIN <span style={{color:"var(--gray)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(4 digits, optional — secures their login)</span></label>
            <input className="form-input" type="password" placeholder="e.g. 2305" maxLength={4}
              value={form.pin||""}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g,"").slice(0,4) }))} />
          </div>
          <button className="gold-btn" onClick={addPlayer}>Add to Roster</button>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:500,
          display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem" }}>
          <div style={{ background:"var(--navy-mid)", border:"1px solid var(--border)", borderRadius:16,
            padding:"2rem", maxWidth:340, width:"100%", textAlign:"center" }}>
            <div style={{ fontSize:"2rem", marginBottom:".75rem" }}>⚠️</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:"1.25rem", fontWeight:700, marginBottom:".5rem" }}>
              Remove {athletes.find(a=>a.id===confirm)?.name}?
            </div>
            <div style={{ fontSize:".85rem", color:"var(--gray)", marginBottom:"1.5rem" }}>
              This will remove them from the roster. Their logged workout data will be kept.
            </div>
            <div style={{ display:"flex", gap:"1rem" }}>
              <button className="back-btn" style={{ flex:1 }} onClick={() => setConfirm(null)}>Cancel</button>
              <button className="gold-btn" style={{ flex:1, background:"var(--danger)", color:"#fff" }}
                onClick={() => removePlayer(confirm)}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Roster list */}
      <div style={{ background:"var(--navy-light)", border:"1px solid var(--border)", borderRadius:12, overflow:"hidden" }}>
        {/* Header row */}
        <div style={{ display:"grid", gridTemplateColumns:"48px 1fr auto", gap:"1rem", padding:".6rem 1rem",
          borderBottom:"1px solid var(--border)", fontSize:".7rem", color:"var(--gray)",
          letterSpacing:".1em", textTransform:"uppercase" }}>
          <span>#</span><span>Player</span><span />
        </div>

        {athletes.length === 0 && (
          <div style={{ padding:"2rem", textAlign:"center", color:"var(--gray)" }}>
            No players on roster yet. Add one above.
          </div>
        )}

        {[...athletes].sort((a,b) => (parseInt(a.number)||99) - (parseInt(b.number)||99)).map(a => (
          <div key={a.id}>
            {editId === a.id && editForm ? (
              /* ── Inline edit ── */
              <div style={{ padding:"1rem", borderBottom:"1px solid var(--bs)", background:"rgba(232,184,75,.05)" }}>
                <div className="form-row">
                  <div className="form-field" style={fieldStyle}>
                    <label>Full Name</label>
                    <input className="form-input" value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                  </div>
                  <div className="form-field" style={fieldStyle}>
                    <label>Jersey #</label>
                    <input className="form-input" value={editForm.number}
                      onChange={e => setEditForm(f => ({ ...f, number: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field" style={fieldStyle}>
                    <label>Position</label>
                    <select className="form-input" value={editForm.position}
                      onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))}>
                      {POSITIONS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-field" style={fieldStyle}>
                    <label>Year</label>
                    <select className="form-input" value={editForm.year||""}
                      onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))}>
                      <option value="">—</option>
                      {["Fr","So","Jr","Sr","Grad","RS Fr","RS So","RS Jr","RS Sr"].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field" style={fieldStyle}>
                    <label>Height</label>
                    <input className="form-input" placeholder="e.g. 6ft 4in" value={editForm.height||""}
                      onChange={e => setEditForm(f => ({ ...f, height: e.target.value }))} />
                  </div>
                  <div className="form-field" style={fieldStyle}>
                    <label>Weight (lbs)</label>
                    <input className="form-input" placeholder="195" value={editForm.weight||""}
                      onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))} />
                  </div>
                </div>
                <div className="form-field" style={{marginBottom:".75rem"}}>
                  <label>Coach Notes <span style={{color:"var(--danger)",fontSize:".7rem",fontWeight:600,
                    textTransform:"none",letterSpacing:0}}>🔒 Private — never shown to athlete</span></label>
                  <textarea className="form-input" rows={3}
                    placeholder="e.g. Responds well to competition. Tends to overdo volume."
                    value={editForm.coachNotes||""}
                    onChange={e=>setEditForm(f=>({...f,coachNotes:e.target.value}))}
                    style={{resize:"vertical"}}/>
                </div>
                <div className="form-field" style={{marginBottom:".75rem"}}>
                  <label>Player PIN <span style={{color:"var(--gray)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(4 digits — leave blank for no PIN)</span></label>
                  <input className="form-input" type="password" placeholder="e.g. 2305" maxLength={4}
                    value={editForm.pin||""}
                    onChange={e=>setEditForm(f=>({...f,pin:e.target.value.replace(/[^0-9]/g,"").slice(0,4)}))} />
                </div>
                <div style={{ display:"flex", gap:".75rem", flexWrap:"wrap" }}>
                  <button className="gold-btn" style={{ padding:".5rem 1.25rem", fontSize:".85rem" }}
                    onClick={() => saveEdit(a.id)}>Save</button>
                  <button className="back-btn" onClick={() => setEditId(null)}>Cancel</button>
                  <button className="back-btn" style={{ marginLeft:"auto", color:"var(--danger)", borderColor:"var(--danger)" }}
                    onClick={() => setConfirm(a.id)}>Remove</button>
                </div>
              </div>
            ) : (
              /* ── Display row ── */
              <div style={{ display:"grid", gridTemplateColumns:"48px 1fr auto", gap:"1rem",
                padding:".875rem 1rem", borderBottom:"1px solid var(--bs)", alignItems:"center",
                cursor:"pointer", transition:"background .15s" }}
                onClick={() => { setEditId(a.id); setEditForm({ name:a.name, number:a.number||"", position:a.position||"PG", year:a.year||"", height:a.height||"", weight:a.weight||"", pin:a.pin||"", coachNotes:a.coachNotes||"" }); setShowAdd(false); }}
                onMouseOver={e=>e.currentTarget.style.background="rgba(232,184,75,.04)"}
                onMouseOut={e=>e.currentTarget.style.background=""}>

                {/* Jersey number badge */}
                <div style={{ width:38, height:38, borderRadius:"50%", background:"var(--gold)",
                  color:"var(--navy)", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                  fontSize:".85rem", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {a.number ? `#${a.number}` : "—"}
                </div>

                {/* Name + details */}
                <div>
                  <div style={{ fontWeight:600, fontSize:".95rem", color:"var(--white)" }}>{a.name}</div>
                  <div style={{ display:"flex", gap:".5rem", marginTop:".2rem", flexWrap:"wrap" }}>
                    <span style={{ fontSize:".75rem", color:"var(--gold)", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700 }}>{a.position}</span>
                    {a.year && <span style={{ fontSize:".75rem", color:"var(--gray)" }}>{a.year}</span>}
                    {a.height && <span style={{ fontSize:".75rem", color:"var(--gray)" }}>{a.height}</span>}
                    {a.weight && <span style={{ fontSize:".75rem", color:"var(--gray)" }}>{a.weight} lbs</span>}
                    {a.pin && <span style={{ fontSize:".7rem", color:"var(--gray)" }}>🔒</span>}
                  </div>
                  {a.coachNotes && (
                    <div style={{fontSize:".72rem",color:"var(--gray)",marginTop:".3rem",
                      fontStyle:"italic",maxWidth:320,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      📝 {a.coachNotes}
                    </div>
                  )}
                </div>

                <span style={{ color:"var(--gray)", fontSize:".85rem" }}>Edit ›</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── THOUGHT OF THE WEEK TAB ─────────────────────────────────────────────────
function ThoughtTab({ thought, saveThought, thoughtHistory }) {
  const [form, setForm] = useState({ text: thought?.text||"", author: thought?.author||"" });
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleSave = () => {
    if (!form.text.trim()) return;
    saveThought(form, true); // true = archive old before saving
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    const empty = { text:"", author:"" };
    setForm(empty);
    saveThought(empty);
  };

  const restoreFromHistory = (entry) => {
    setForm({ text: entry.text, author: entry.author||"" });
    setShowHistory(false);
  };

  return (
    <div>
      <div className="lib-header">
        <div>
          <div className="section-title" style={{margin:0}}>Thought of the Week</div>
          <div style={{fontSize:".8rem",color:"var(--gray)",marginTop:".2rem"}}>
            Shown to every player on the home screen
          </div>
        </div>
      </div>

      {/* Preview */}
      {form.text && (
        <div style={{background:"rgba(232,184,75,.07)",border:"1px solid var(--border)",
          borderLeft:"3px solid var(--gold)",borderRadius:"0 12px 12px 0",
          padding:"1rem 1.25rem",marginBottom:"1.5rem"}}>
          <div style={{fontSize:".65rem",color:"var(--gold)",letterSpacing:".14em",
            textTransform:"uppercase",marginBottom:".5rem",fontWeight:600}}>Preview</div>
          <div style={{fontSize:"1rem",color:"var(--white)",lineHeight:1.55,fontStyle:"italic"}}>
            "{form.text}"
          </div>
          {form.author && (
            <div style={{fontSize:".8rem",color:"var(--gray)",marginTop:".5rem"}}>— {form.author}</div>
          )}
        </div>
      )}

      <div className="builder-form">
        <div className="form-field">
          <label>Quote / Thought</label>
          <textarea className="form-input" rows={4} value={form.text}
            placeholder="e.g. Hard work beats talent when talent doesn't work hard."
            onChange={e=>setForm(f=>({...f,text:e.target.value}))}
            style={{resize:"vertical"}}/>
        </div>
        <div className="form-field" style={{marginBottom:0}}>
          <label>Attribution <span style={{color:"var(--gray)",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
          <input className="form-input" value={form.author}
            placeholder="e.g. Tim Notke"
            onChange={e=>setForm(f=>({...f,author:e.target.value}))}/>
        </div>
      </div>

      <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
        <button className="gold-btn" onClick={handleSave}>
          {saved ? "✓ Saved!" : "Save & Publish"}
        </button>
        {(thought?.text) && (
          <button className="back-btn" onClick={handleClear}
            style={{color:"var(--danger)",borderColor:"var(--danger)"}}>
            Clear
          </button>
        )}
      </div>

      <div style={{marginTop:"2rem",padding:"1rem",background:"var(--navy-light)",
        border:"1px solid var(--border)",borderRadius:10,fontSize:".8rem",color:"var(--gray)",lineHeight:1.6}}>
        <div style={{color:"var(--white)",fontWeight:600,marginBottom:".4rem"}}>How it works</div>
        Type your quote, hit Save — it instantly appears on the home screen for every player.
        Change it any time. Leave it blank to hide it.
      </div>

      {/* History */}
      {(thoughtHistory||[]).length > 0 && (
        <div style={{marginTop:"1.5rem"}}>
          <button onClick={()=>setShowHistory(v=>!v)}
            style={{background:"transparent",border:"1px solid var(--border)",color:"var(--gray)",
              borderRadius:8,padding:".4rem .875rem",cursor:"pointer",width:"100%",
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,fontSize:".85rem",
              textAlign:"left",display:"flex",justifyContent:"space-between"}}>
            <span>📚 Past Thoughts ({thoughtHistory.length})</span>
            <span>{showHistory?"▲":"▼"}</span>
          </button>
          {showHistory && (
            <div style={{marginTop:".5rem",display:"flex",flexDirection:"column",gap:".5rem"}}>
              {(thoughtHistory||[]).map((entry,i)=>(
                <div key={i} style={{background:"var(--navy-light)",border:"1px solid var(--border)",
                  borderRadius:10,padding:".875rem 1rem",
                  display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:".85rem",color:"var(--white)",fontStyle:"italic",lineHeight:1.5,marginBottom:".25rem"}}>
                      "{entry.text}"
                    </div>
                    {entry.author && <div style={{fontSize:".75rem",color:"var(--gray)"}}>— {entry.author}</div>}
                    {entry.date && <div style={{fontSize:".7rem",color:"var(--gray)",marginTop:".2rem"}}>{fmtDate(entry.date)}</div>}
                  </div>
                  <button onClick={()=>restoreFromHistory(entry)}
                    style={{background:"transparent",border:"1px solid var(--border)",color:"var(--gold)",
                      borderRadius:6,padding:".3rem .6rem",cursor:"pointer",flexShrink:0,
                      fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".75rem"}}>
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REST TIMER
// ═══════════════════════════════════════════════════════════════════════════════
function RestTimer() {
  const PRESETS = [60, 90, 120, 180];
  const [open,    setOpen]    = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            setDone(true);
            // Vibrate if supported
            if (navigator.vibrate) navigator.vibrate([200,100,200,100,400]);
            setTimeout(() => setDone(false), 3000);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const start  = (s) => { setSeconds(s); setRunning(true); setDone(false); setOpen(false); };
  const pause  = () => { clearInterval(intervalRef.current); setRunning(false); };
  const reset  = () => { clearInterval(intervalRef.current); setRunning(false); setSeconds(0); setDone(false); };

  const pct    = seconds > 0 ? (seconds / (PRESETS.find(p=>p>=seconds)||seconds)) * 100 : 0;
  const mins   = Math.floor(seconds / 60);
  const secs   = seconds % 60;
  const display= `${mins}:${String(secs).padStart(2,"0")}`;

  if (done) return (
    <div style={{display:"flex",alignItems:"center",gap:".5rem",
      background:"var(--success)",borderRadius:20,padding:".4rem 1rem",
      fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,color:"#fff",fontSize:".9rem"}}>
      ✓ Rest Over — Go!
    </div>
  );

  if (running || seconds > 0) return (
    <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
      <div style={{position:"relative",width:44,height:44,flexShrink:0}}>
        <svg width="44" height="44" style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--navy-light)" strokeWidth="3"/>
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--gold)" strokeWidth="3"
            strokeDasharray={`${2*Math.PI*18}`}
            strokeDashoffset={`${2*Math.PI*18*(1-pct/100)}`}
            style={{transition:"stroke-dashoffset .9s linear"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
          fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".75rem",color:"var(--gold)"}}>
          {display}
        </div>
      </div>
      <div style={{display:"flex",gap:4}}>
        <button className="th-timer-btn" style={{padding:".3rem .6rem",fontSize:".8rem"}}
          onClick={running ? pause : ()=>setRunning(true)}>
          {running?"⏸":"▶"}
        </button>
        <button className="th-timer-btn" style={{padding:".3rem .6rem",fontSize:".8rem"}} onClick={reset}>✕</button>
      </div>
    </div>
  );

  return (
    <div style={{position:"relative"}}>
      <button className="th-timer-btn" onClick={()=>setOpen(v=>!v)}>⏱ Rest Timer</button>
      {open && (
        <div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",
          background:"var(--navy-mid)",border:"1px solid var(--border)",borderRadius:12,
          padding:".75rem",display:"flex",gap:".5rem",zIndex:50,boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>
          {PRESETS.map(s=>(
            <button key={s} onClick={()=>start(s)}
              style={{background:"var(--navy-light)",border:"1px solid var(--border)",color:"var(--gold)",
                borderRadius:8,padding:".4rem .75rem",cursor:"pointer",
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".9rem",
                whiteSpace:"nowrap"}}>
              {s<60?`${s}s`:s===60?"1m":s===90?"1:30":s===120?"2m":"3m"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// ATHLETE PROFILE / STATS PANEL  (full-screen view when player taps "📊 My Stats")
// ═══════════════════════════════════════════════════════════════════════════════
function AthleteProgressPanel({ athlete, logs, library, readiness }) {
  const myLogs     = logs.filter(l => l.athleteId === athlete.id);
  const weightLogs = myLogs.filter(l => l.weight > 0);
  const exercises  = [...new Set(weightLogs.map(l => l.exerciseName))].sort();

  // ── Readiness trend ─────────────────────────────────────────────────────────
  const myReadiness = (readiness || [])
    .filter(r => r.athleteId === athlete.id)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(-14);
  const rdyAvg = (field) => {
    const vals = myReadiness.map(r => r[field]).filter(Boolean);
    return vals.length ? (vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1) : "—";
  };

  // ── Volume ──────────────────────────────────────────────────────────────────
  const weekAgo    = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const weekVol    = weightLogs.filter(l=>new Date(l.date)>=weekAgo).reduce((s,l)=>s+(l.weight*(l.reps||1)),0);
  const allTimeVol = weightLogs.reduce((s,l)=>s+(l.weight*(l.reps||1)),0);
  const sessions   = [...new Set(myLogs.map(l=>l.date))].sort();
  const lastSess   = sessions[sessions.length-1];

  // ── PRs ─────────────────────────────────────────────────────────────────────
  const prList = exercises.map(ex => {
    const exLogs = weightLogs.filter(l=>l.exerciseName===ex);
    const orms   = exLogs.map(l=>({
      date:l.date,
      orm:calc1RM(l.weight,l.reps) ?? ((!l.reps||l.reps===0)?l.weight:null),
      weight:l.weight, reps:l.reps
    })).filter(l=>l.orm).sort((a,b)=>a.date.localeCompare(b.date));
    if (!orms.length) return null;
    const best   = orms.reduce((m,x)=>x.orm>m.orm?x:m, orms[0]);
    const latest = orms[orms.length-1];
    const prev   = orms.length>1?orms[orms.length-2]:null;
    const trend  = prev ? (latest.orm>prev.orm?"📈":latest.orm<prev.orm?"📉":"➡️") : "";
    const bw     = parseFloat(athlete.weight);
    const rel    = bw>0 ? (best.orm/bw).toFixed(2) : null;
    return { ex, best, latest, trend, rel };
  }).filter(Boolean).sort((a,b)=>b.best.orm-a.best.orm);

  // ── Weekly volume sparkline ──────────────────────────────────────────────────
  const weeklyVol = (() => {
    const weeks = [];
    for (let i=7; i>=0; i--) {
      const start = new Date(); start.setDate(start.getDate()-(i*7+6));
      const end   = new Date(); end.setDate(end.getDate()-(i*7));
      const s=start.toLocaleDateString("en-CA"), e=end.toLocaleDateString("en-CA");
      const vol=weightLogs.filter(l=>l.date>=s&&l.date<=e).reduce((sum,l)=>sum+(l.weight*(l.reps||1)),0);
      weeks.push({label:`W${8-i}`,vol:Math.round(vol)});
    }
    return weeks;
  })();
  const maxVol = Math.max(...weeklyVol.map(w=>w.vol),1);

  return (
    <div style={{paddingBottom:"2rem"}}>

      {/* Bio card */}
      <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",
        borderRadius:14,padding:"1.25rem",marginBottom:"1.25rem",
        display:"flex",alignItems:"center",gap:"1.25rem"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:"var(--gold)",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
          fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:"1.4rem",color:"var(--navy)"}}>
          {athlete.name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,
            fontSize:"1.4rem",color:"var(--white)",lineHeight:1.1}}>{athlete.name}</div>
          <div style={{fontSize:".8rem",color:"var(--gray)",marginTop:".2rem"}}>
            #{athlete.number} · {athlete.position} · {athlete.year}
            {athlete.height ? ` · ${athlete.height}` : ""}
            {athlete.weight ? ` · ${athlete.weight} lb` : ""}
          </div>
        </div>
      </div>

      {/* Body weight trend */}
      {(athlete.weightLog||[]).length > 1 && (() => {
        const wLog = (athlete.weightLog||[]).slice(-12);
        const maxW = Math.max(...wLog.map(w=>w.weight));
        const minW = Math.min(...wLog.map(w=>w.weight));
        const range = maxW - minW || 1;
        const latest = wLog[wLog.length-1];
        const first  = wLog[0];
        const change = latest.weight - first.weight;
        return (
          <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",
            borderRadius:12,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
              <div style={{fontSize:".7rem",color:"var(--gold)",letterSpacing:".08em",
                textTransform:"uppercase",fontWeight:600}}>
                Body Weight Trend
              </div>
              <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                  fontSize:"1.1rem",color:"var(--white)"}}>{latest.weight} lb</span>
                {change!==0 && <span style={{fontSize:".75rem",
                  color:change>0?"var(--danger)":"var(--success)"}}>
                  {change>0?"+":""}{change.toFixed(1)} lb
                </span>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",gap:3,height:36}}>
              {wLog.map((w,i)=>{
                const h=20+((w.weight-minW)/range)*80;
                const cur=i===wLog.length-1;
                return (
                  <div key={i} title={`${w.weight}lb · ${fmtDate(w.date)}`}
                    style={{flex:1,borderRadius:3,minHeight:4,transition:"height .3s",
                      background:cur?"var(--gold)":"rgba(232,184,75,.35)",
                      height:`${h}%`}}/>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Stat summary row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".75rem",marginBottom:"1.25rem"}}>
        {[
          {label:"Sessions",val:sessions.length},
          {label:"Week Vol",val:weekVol>0?`${(weekVol/1000).toFixed(1)}k`:"—"},
          {label:"All-Time Vol",val:allTimeVol>0?`${(allTimeVol/1000).toFixed(0)}k`:"—"},
        ].map(({label,val})=>(
          <div key={label} className="stat-card" style={{padding:".875rem .5rem",textAlign:"center"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
              fontSize:"1.4rem",color:"var(--gold)"}}>{val}</div>
            <div style={{fontSize:".65rem",color:"var(--gray)",textTransform:"uppercase",
              letterSpacing:".06em",marginTop:".15rem"}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Volume sparkline */}
      {maxVol > 0 && (
        <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",
          borderRadius:12,padding:"1rem 1.25rem",marginBottom:"1.25rem"}}>
          <div style={{fontSize:".7rem",color:"var(--gold)",letterSpacing:".08em",
            textTransform:"uppercase",fontWeight:600,marginBottom:".75rem"}}>
            Volume Trend — Last 8 Weeks
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:48}}>
            {weeklyVol.map((w,i)=>{
              const h=w.vol>0?Math.max(8,(w.vol/maxVol)*100):4;
              const cur=i===weeklyVol.length-1;
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",
                  alignItems:"center",gap:2}}>
                  <div style={{width:"100%",borderRadius:3,minHeight:3,transition:"height .3s",
                    background:cur?"var(--gold)":w.vol>0?"rgba(232,184,75,.4)":"var(--navy)",
                    height:`${h}%`}}/>
                  <div style={{fontSize:".55rem",color:cur?"var(--gold)":"var(--gray)"}}>{w.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Readiness trend */}
      {myReadiness.length > 0 && (
        <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",
          borderRadius:12,overflow:"hidden",marginBottom:"1.25rem"}}>
          <div style={{padding:".875rem 1.25rem",borderBottom:"1px solid var(--border)"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
              fontSize:"1rem",color:"var(--gold)"}}>
              My Readiness — Last {myReadiness.length} Check-ins
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1px",background:"var(--border)"}}>
            {[{label:"😴 Sleep",field:"sleep"},{label:"💪 Sore",field:"soreness"},{label:"🧠 Stress",field:"stress"}].map(({label,field})=>(
              <div key={field} style={{background:"var(--navy-light)",padding:".875rem .5rem",textAlign:"center"}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.4rem",
                  fontWeight:700,color:"var(--white)"}}>{rdyAvg(field)}</div>
                <div style={{fontSize:".65rem",color:"var(--gray)",marginTop:".15rem"}}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{padding:".6rem 1.25rem",display:"flex",gap:3,alignItems:"flex-end",height:32}}>
            {myReadiness.map((r,i)=>{
              const c=(r.sleep||3)+(6-(r.soreness||3))+(6-(r.stress||3));
              const h=Math.max(15,Math.min(100,(c/15)*100));
              return <div key={i} style={{flex:1,height:`${h}%`,background:"var(--gold)",
                opacity:.35+((c/15)*.65),borderRadius:2}}/>;
            })}
          </div>
        </div>
      )}

      {/* Strength PRs */}
      {prList.length > 0 && (
        <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",
          borderRadius:12,overflow:"hidden",marginBottom:"1.25rem"}}>
          <div style={{padding:".875rem 1.25rem",borderBottom:"1px solid var(--border)",
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
              fontSize:"1rem",color:"var(--gold)"}}>
              🏆 Strength PRs
            </div>
            <div style={{fontSize:".75rem",color:"var(--gray)"}}>{prList.length} exercises</div>
          </div>
          {prList.map(({ex,best,latest,trend,rel})=>{
            const allMax=Math.max(...prList.map(p=>p.best.orm),1);
            return (
              <div key={ex} style={{padding:".75rem 1.25rem",borderBottom:"1px solid var(--bs)"}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:".35rem"}}>
                  <span style={{fontSize:".85rem",fontWeight:500,color:"var(--gray)"}}>{ex}</span>
                  <div style={{display:"flex",alignItems:"center",gap:".6rem"}}>
                    {rel && <span style={{fontSize:".7rem",color:"var(--gray)"}}>{rel}× BW</span>}
                    <span style={{color:"var(--gold)",fontFamily:"'Barlow Condensed',sans-serif",
                      fontWeight:700,fontSize:".95rem"}}>~{best.orm} lb</span>
                    {trend && <span style={{fontSize:".9rem"}}>{trend}</span>}
                  </div>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{width:`${Math.round((best.orm/allMax)*100)}%`}}/>
                </div>
                <div style={{fontSize:".68rem",color:"var(--gray)",marginTop:".25rem"}}>
                  Best: {best.weight}lb × {best.reps} reps on {fmtDate(best.date)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {prList.length===0 && (
        <div style={{textAlign:"center",padding:"1.5rem",color:"var(--gray)",
          background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12}}>
          No workout data logged yet. Complete some sessions to see your progress here.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ athletes, logs, checkins, scheduled, readiness, gameDay, saveGameDay }) {
  // Date toggle — Today or Yesterday
  const YESTERDAY = (() => {
    const d = new Date(); d.setDate(d.getDate()-1);
    return d.toLocaleDateString("en-CA");
  })();
  const [viewDate, setViewDate] = useState(TODAY);
  const isToday = viewDate === TODAY;

  // All data derived from viewDate so toggling recalculates everything
  const dayW        = scheduled.find(s=>s.date===viewDate);
  const dayCheckins = checkins.filter(c=>c.date===viewDate);
  const checkedIds  = new Set(dayCheckins.map(c=>c.athleteId));
  const missing     = athletes.filter(a=>!checkedIds.has(a.id));

  // PRs on the selected day
  const dayLogs  = logs.filter(l=>l.date===viewDate&&l.weight>0);
  const prsDay   = [];
  const seen     = new Set();
  dayLogs.forEach(l=>{
    const key=`${l.athleteId}-${l.exerciseName}`;
    if(seen.has(key))return; seen.add(key);
    const prior = logs.filter(x=>x.athleteId===l.athleteId&&x.exerciseName===l.exerciseName&&x.date<viewDate&&x.weight>0);
    const prevMax = prior.length ? Math.max(...prior.map(x=>calc1RM(x.weight,x.reps)).filter(Boolean)) : null;
    const dayMax  = Math.max(...dayLogs.filter(x=>x.athleteId===l.athleteId&&x.exerciseName===l.exerciseName).map(x=>calc1RM(x.weight,x.reps)).filter(Boolean));
    if(prevMax!==null && dayMax>prevMax){
      const ath=athletes.find(a=>a.id===l.athleteId);
      prsDay.push({name:ath?.name||l.athleteId, exercise:l.exerciseName, orm:dayMax});
    }
  });

  // Week summary (always based on last 7 days regardless of toggle)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const weekCheckins = checkins.filter(c=>new Date(c.date)>=weekAgo).length;
  const totalSets    = dayLogs.length;

  // Volume load = sum of (weight × reps) across all sets — the standard strength metric
  const dayVolume  = dayLogs.reduce((sum,l)=> sum + (l.weight * l.reps), 0);
  const weekLogs   = logs.filter(l => new Date(l.date) >= weekAgo && l.weight > 0);
  const weekVolume = weekLogs.reduce((sum,l)=> sum + (l.weight * l.reps), 0);

  // Per-athlete volume breakdown for the selected day
  const volumeByAthlete = athletes.map(a => {
    const aLogs = dayLogs.filter(l => l.athleteId === a.id);
    const vol = aLogs.reduce((sum,l)=> sum + (l.weight * l.reps), 0);
    return { ...a, volume: vol, sets: aLogs.length };
  }).filter(a => a.volume > 0).sort((a,b) => b.volume - a.volume);

  const dayLabel = isToday ? "Today" : "Yesterday";
  const dayFull  = new Date(viewDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric"});

  return (
    <div>
      {/* Game Day Banner */}
      {gameDay === TODAY && (
        <div style={{background:"rgba(232,184,75,.1)",border:"2px solid var(--gold)",
          borderRadius:12,padding:".875rem 1.25rem",marginBottom:"1.25rem",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
            <span style={{fontSize:"1.5rem"}}>🏀</span>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,
                fontSize:"1.25rem",color:"var(--gold)",letterSpacing:".06em"}}>GAME DAY</div>
              <div style={{fontSize:".75rem",color:"var(--gray)"}}>Focus on recovery & activation today</div>
            </div>
          </div>
          <button onClick={()=>saveGameDay(null)}
            style={{background:"transparent",border:"1px solid rgba(232,184,75,.4)",
              color:"var(--gold)",borderRadius:6,padding:".3rem .6rem",cursor:"pointer",
              fontSize:".75rem",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>
            Clear
          </button>
        </div>
      )}

      {/* Header with Today / Yesterday toggle + Game Day button */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:".75rem"}}>
        <div className="section-title" style={{margin:0}}>{dayLabel}'s Overview</div>
        <div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:".4rem",background:"var(--navy-light)",borderRadius:8,padding:".3rem"}}>
            <button onClick={()=>setViewDate(TODAY)}
              style={{padding:".35rem .875rem",borderRadius:6,border:"none",cursor:"pointer",
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".85rem",
                letterSpacing:".05em",transition:"all .15s",
                background:isToday?"var(--gold)":"transparent",
                color:isToday?"var(--navy)":"var(--gray)"}}>
              Today
            </button>
            <button onClick={()=>setViewDate(YESTERDAY)}
              style={{padding:".35rem .875rem",borderRadius:6,border:"none",cursor:"pointer",
                fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".85rem",
                letterSpacing:".05em",transition:"all .15s",
                background:!isToday?"var(--gold)":"transparent",
                color:!isToday?"var(--navy)":"var(--gray)"}}>
              Yesterday
            </button>
          </div>
          <button onClick={()=>saveGameDay(gameDay===TODAY?null:TODAY)}
            style={{padding:".35rem .75rem",borderRadius:8,cursor:"pointer",
              fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".8rem",
              background:gameDay===TODAY?"var(--gold)":"transparent",
              color:gameDay===TODAY?"var(--navy)":"var(--gray)",
              border:`1px solid ${gameDay===TODAY?"var(--gold)":"var(--border)"}`,
              transition:"all .15s"}}>
            🏀 {gameDay===TODAY?"Game Day ✓":"Game Day"}
          </button>
        </div>
      </div>
      <div style={{fontSize:".8rem",color:"var(--gray)",marginBottom:"1.5rem"}}>{dayFull}</div>

      {/* Stat cards */}
      <div className="stat-grid" style={{marginBottom:"1.5rem"}}>
        <div className="stat-card">
          <div className="stat-num">{dayCheckins.length}/{athletes.length}</div>
          <div className="stat-lbl">Checked In</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{totalSets}</div>
          <div className="stat-lbl">Sets Logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{prsDay.length}</div>
          <div className="stat-lbl">PRs Hit 🏆</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{weekCheckins}</div>
          <div className="stat-lbl">Check-Ins (7 days)</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{dayVolume.toLocaleString()}</div>
          <div className="stat-lbl">{dayLabel}'s Volume (lb)</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{weekVolume.toLocaleString()}</div>
          <div className="stat-lbl">Week Volume (lb)</div>
        </div>
      </div>

      {/* Day's workout */}
      <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12,
        padding:"1rem 1.25rem",marginBottom:"1.5rem"}}>
        <div style={{fontSize:".7rem",color:"var(--gray)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".3rem"}}>{dayLabel}'s Workout</div>
        {dayW
          ? <><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1.3rem",fontWeight:700}}>{dayW.title}</div>
              <div style={{fontSize:".8rem",color:"var(--gray)",marginTop:".2rem"}}>{dayW.blocks.length} exercises · {(dayW.type||"Strength")}</div></>
          : <div style={{color:"var(--gray)",fontSize:".9rem"}}>No workout scheduled {dayLabel.toLowerCase()}</div>}
      </div>

      {/* ── DAILY LEADERBOARD ──────────────────────────────────────────────── */}
      {(prsDay.length > 0 || volumeByAthlete.length > 0) && (() => {
        const [lbTab, setLbTab] = React.useState("volume");
        const showAll = React.useState(false);
        const [expanded, setExpanded] = showAll;

        // Session quality score: (sets_logged/sets_programmed) × avg_weight_vs_last_session
        const qualityRanked = volumeByAthlete.map(a => {
          const dayW2 = scheduled.find(s=>s.date===viewDate);
          const programmed = dayW2?.blocks?.length || 0;
          const exercisesDone = new Set(dayLogs.filter(l=>l.athleteId===a.id).map(l=>l.exerciseName)).size;
          const completionPct = programmed > 0 ? Math.min(exercisesDone/programmed, 1) : 0;
          // Avg weight this session vs last session for same exercises
          const myToday = dayLogs.filter(l=>l.athleteId===a.id&&l.weight>0);
          const avgWeightToday = myToday.length ? myToday.reduce((s,l)=>s+l.weight,0)/myToday.length : 0;
          const prevLogs = logs.filter(l=>l.athleteId===a.id&&l.date<viewDate&&l.weight>0);
          const avgWeightPrev = prevLogs.length ? prevLogs.slice(-myToday.length||1).reduce((s,l)=>s+l.weight,0)/Math.max(prevLogs.slice(-myToday.length||1).length,1) : avgWeightToday;
          const weightRatio = avgWeightPrev > 0 ? avgWeightToday/avgWeightPrev : 1;
          const quality = Math.round(((completionPct*0.5)+(Math.min(weightRatio,1.2)*0.5))*100);
          return {...a, quality, completionPct: Math.round(completionPct*100)};
        }).sort((a,b)=>b.quality-a.quality);

        const displayList = lbTab==="volume" ? volumeByAthlete
          : lbTab==="prs" ? prsDay
          : qualityRanked;

        const maxVol = volumeByAthlete[0]?.volume || 1;
        const visibleCount = expanded ? displayList.length : 5;

        return (
          <div style={{marginBottom:"1.5rem"}}>
            {/* Leaderboard header + tab switcher */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem",flexWrap:"wrap",gap:".5rem"}}>
              <div className="section-title" style={{margin:0,fontSize:"1.1rem"}}>
                {lbTab==="volume"?"💪 Volume Leaders":lbTab==="prs"?"🏆 PRs Hit":"⭐ Session Quality"} — {dayLabel}
              </div>
              <div style={{display:"flex",gap:".3rem",background:"var(--navy-light)",borderRadius:8,padding:".25rem"}}>
                {[["volume","Vol"],["quality","Quality"],["prs","PRs"]].map(([t,l])=>(
                  <button key={t} onClick={()=>setLbTab(t)}
                    style={{padding:".3rem .65rem",borderRadius:6,border:"none",cursor:"pointer",
                      fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".8rem",
                      background:lbTab===t?"var(--gold)":"transparent",
                      color:lbTab===t?"var(--navy)":"var(--gray)",transition:"all .15s"}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
              {lbTab==="prs" ? (
                prsDay.length===0
                  ? <div style={{padding:"1rem",color:"var(--gray)",fontSize:".85rem",textAlign:"center"}}>No PRs recorded {dayLabel.toLowerCase()}</div>
                  : prsDay.slice(0, visibleCount).map((pr,i)=>(
                    <div key={i} style={{padding:".75rem 1rem",borderBottom:i<Math.min(prsDay.length,visibleCount)-1?"1px solid var(--bs)":"none",
                      display:"flex",justifyContent:"space-between",alignItems:"center",
                      background:i===0?"rgba(232,184,75,.05)":""}}>
                      <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
                          fontSize:"1rem",color:"var(--gold)",width:24,textAlign:"center"}}>
                          {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}
                        </div>
                        <div>
                          <div style={{fontWeight:600,fontSize:".875rem"}}>{pr.name?.split(" ")[0]} <span style={{color:"var(--gray)",fontWeight:400}}>{pr.name?.split(" ").slice(1).join(" ")}</span></div>
                          <div style={{fontSize:".72rem",color:"var(--gray)"}}>{pr.exercise}</div>
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",color:"var(--gold)",fontWeight:700,fontSize:"1rem"}}>~{pr.orm} lb</div>
                      </div>
                    </div>
                  ))
              ) : lbTab==="quality" ? (
                qualityRanked.length===0
                  ? <div style={{padding:"1rem",color:"var(--gray)",fontSize:".85rem",textAlign:"center"}}>No data yet {dayLabel.toLowerCase()}</div>
                  : qualityRanked.slice(0, visibleCount).map((a,i)=>(
                    <div key={a.id} style={{padding:".75rem 1rem",borderBottom:i<Math.min(qualityRanked.length,visibleCount)-1?"1px solid var(--bs)":"none",
                      display:"flex",alignItems:"center",gap:".75rem",background:i===0?"rgba(232,184,75,.05)":""}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
                        fontSize:"1rem",color:"var(--gold)",width:24,textAlign:"center",flexShrink:0}}>
                        {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:".2rem"}}>
                          <span style={{fontWeight:600,fontSize:".875rem"}}>
                            {a.name?.split(" ")[0]} <span style={{color:"var(--gray)",fontWeight:400}}>#{a.number}</span>
                          </span>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                            color:a.quality>=85?"var(--success)":a.quality>=65?"var(--gold)":"var(--danger)",fontSize:".95rem"}}>
                            {a.quality}
                          </span>
                        </div>
                        <div className="progress-bar-wrap" style={{height:4}}>
                          <div className="progress-bar-fill" style={{width:`${a.quality}%`,
                            background:a.quality>=85?"var(--success)":a.quality>=65?"var(--gold)":"var(--danger)"}}/>
                        </div>
                        <div style={{fontSize:".65rem",color:"var(--gray)",marginTop:".2rem"}}>{a.completionPct}% completion · {a.sets} sets · {a.volume.toLocaleString()} lb</div>
                      </div>
                    </div>
                  ))
              ) : (
                volumeByAthlete.length===0
                  ? <div style={{padding:"1rem",color:"var(--gray)",fontSize:".85rem",textAlign:"center"}}>No sets logged {dayLabel.toLowerCase()}</div>
                  : volumeByAthlete.slice(0, visibleCount).map((a,i)=>{
                    const pct = Math.round((a.volume/maxVol)*100);
                    const prCount = prsDay.filter(p=>p.athleteId===a.id||athletes.find(x=>x.id===a.id)?.name===p.name).length;
                    return (
                      <div key={a.id} style={{padding:".75rem 1rem",borderBottom:i<Math.min(volumeByAthlete.length,visibleCount)-1?"1px solid var(--bs)":"none",
                        background:i===0?"rgba(232,184,75,.05)":""}}>
                        <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,
                            fontSize:"1rem",color:"var(--gold)",width:24,textAlign:"center",flexShrink:0}}>
                            {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}.`}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:".3rem"}}>
                              <span style={{fontWeight:600,fontSize:".875rem"}}>
                                {a.name?.split(" ")[0]} <span style={{color:"var(--gray)",fontWeight:400}}>#{a.number}</span>
                                {prCount>0 && <span style={{marginLeft:".4rem",fontSize:".75rem"}}>🏆{prCount>1?prCount:""}</span>}
                              </span>
                              <span style={{fontFamily:"'Barlow Condensed',sans-serif",color:"var(--gold)",fontWeight:700,fontSize:".95rem"}}>
                                {a.volume.toLocaleString()} lb
                              </span>
                            </div>
                            <div className="progress-bar-wrap" style={{height:5}}>
                              <div className="progress-bar-fill" style={{width:`${pct}%`}}/>
                            </div>
                            <div style={{fontSize:".65rem",color:"var(--gray)",marginTop:".15rem"}}>{a.sets} sets</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}

              {/* Show more / less */}
              {displayList.length > 5 && (
                <button onClick={()=>setExpanded(v=>!v)}
                  style={{width:"100%",padding:".6rem",background:"transparent",border:"none",
                    borderTop:"1px solid var(--border)",color:"var(--gray)",cursor:"pointer",
                    fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".8rem",
                    letterSpacing:".05em"}}>
                  {expanded ? "▲ Show Top 5" : `▼ Show All ${displayList.length} Players`}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Team readiness — awareness, not a scoreboard. Coach-only context. */}
      {(() => {
        const dayReadiness = (readiness || []).filter(r => r.date === viewDate);
        if (!dayReadiness.length) return null;
        const avg = (field) => {
          const vals = dayReadiness.map(r => r[field]).filter(Boolean);
          return vals.length ? (vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1) : "—";
        };
        const flagged = dayReadiness.filter(r => {
          const composite = (r.sleep||3) + (6-(r.soreness||3)) + (6-(r.stress||3));
          return composite <= 7;
        });
        return (
          <div style={{marginBottom:"1.5rem"}}>
            <div className="section-title" style={{marginBottom:".5rem",fontSize:"1.1rem"}}>
              🌤️ Team Readiness — {dayLabel} ({dayReadiness.length} checked in)
            </div>
            <div style={{fontSize:".75rem",color:"var(--gray)",marginBottom:".75rem"}}>
              Self-reported, voluntary. Use as context, not a report card.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:".75rem",marginBottom:flagged.length?".75rem":0}}>
              {[
                {label:"😴 Avg Sleep",field:"sleep"},
                {label:"💪 Avg Soreness",field:"soreness"},
                {label:"🧠 Avg Stress",field:"stress"},
              ].map(({label,field})=>(
                <div key={field} className="stat-card" style={{padding:".875rem"}}>
                  <div className="stat-num" style={{fontSize:"1.6rem"}}>{avg(field)}</div>
                  <div className="stat-lbl" style={{fontSize:".65rem"}}>{label}</div>
                </div>
              ))}
            </div>
            {flagged.length > 0 && (
              <div style={{background:"rgba(232,184,75,.06)",border:"1px solid var(--border)",borderRadius:10,padding:".75rem 1rem",marginBottom:".75rem"}}>
                <div style={{fontSize:".75rem",color:"var(--gray)",marginBottom:".4rem"}}>
                  Might be running low today — worth a check-in, not a flag:
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:".4rem"}}>
                  {flagged.map((r,i)=>{
                    const ath = athletes.find(a=>a.id===r.athleteId);
                    return (
                      <span key={i} style={{fontSize:".8rem",color:"var(--white)",background:"var(--navy-light)",
                        border:"1px solid var(--border)",borderRadius:6,padding:".2rem .6rem"}}>
                        {ath?.name?.split(" ")[0] || "?"}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Per-player breakdown — sorted so anyone running low surfaces first */}
            <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr",gap:".5rem",
                padding:".6rem .875rem",borderBottom:"1px solid var(--border)",
                fontSize:".65rem",color:"var(--gray)",letterSpacing:".08em",textTransform:"uppercase",fontWeight:600}}>
                <span>Player</span>
                <span style={{textAlign:"center"}}>😴 Sleep</span>
                <span style={{textAlign:"center"}}>💪 Sore</span>
                <span style={{textAlign:"center"}}>🧠 Stress</span>
              </div>
              {[...dayReadiness]
                .sort((a,b) => {
                  const compositeA = (a.sleep||3) + (6-(a.soreness||3)) + (6-(a.stress||3));
                  const compositeB = (b.sleep||3) + (6-(b.soreness||3)) + (6-(b.stress||3));
                  return compositeA - compositeB; // lowest (most concerning) first
                })
                .map((r, i) => {
                  const ath = athletes.find(a => a.id === r.athleteId);
                  const composite = (r.sleep||3) + (6-(r.soreness||3)) + (6-(r.stress||3));
                  const isLow = composite <= 7;
                  const cellColor = (val, goodHigh) => {
                    if (!val) return "var(--gray)";
                    const good = goodHigh ? val >= 4 : val <= 2;
                    const bad  = goodHigh ? val <= 2 : val >= 4;
                    return good ? "var(--success)" : bad ? "var(--danger)" : "var(--white)";
                  };
                  return (
                    <div key={r.athleteId} style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr",gap:".5rem",
                      padding:".6rem .875rem",borderBottom:i < dayReadiness.length-1 ? "1px solid var(--bs)" : "none",
                      alignItems:"center", background: isLow ? "rgba(232,184,75,.04)" : "transparent"}}>
                      <span style={{fontSize:".85rem",fontWeight:500}}>
                        {ath?.name || r.athleteId}{ath?.number ? <span style={{color:"var(--gray)",fontWeight:400}}> #{ath.number}</span> : ""}
                      </span>
                      <span style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                        fontSize:"1rem",color:cellColor(r.sleep,true)}}>{r.sleep || "—"}</span>
                      <span style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                        fontSize:"1rem",color:cellColor(r.soreness,false)}}>{r.soreness || "—"}</span>
                      <span style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                        fontSize:"1rem",color:cellColor(r.stress,false)}}>{r.stress || "—"}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })()}

      {/* Limitations flagged today */}
      {(() => {
        const todayLimitations = dayLogs
          .filter(l => l.limitation)
          .reduce((acc, l) => {
            if (!acc[l.athleteId]) acc[l.athleteId] = l.limitation;
            return acc;
          }, {});
        const entries = Object.entries(todayLimitations);
        if (!entries.length) return null;
        return (
          <div style={{marginBottom:"1.5rem"}}>
            <div className="section-title" style={{marginBottom:".75rem",fontSize:"1.1rem"}}>
              🩹 Limitations Flagged — {dayLabel}
            </div>
            <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
              {entries.map(([athleteId, note], i) => {
                const ath = athletes.find(a => a.id === athleteId);
                return (
                  <div key={athleteId} style={{padding:".75rem 1rem",
                    borderBottom:i<entries.length-1?"1px solid var(--bs)":"none",
                    display:"flex",alignItems:"center",gap:".75rem"}}>
                    <span style={{fontSize:"1rem",flexShrink:0}}>🩹</span>
                    <div>
                      <div style={{fontWeight:600,fontSize:".9rem"}}>{ath?.name||athleteId}</div>
                      <div style={{fontSize:".8rem",color:"var(--gray)",marginTop:".1rem"}}>{note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Who's in / who's missing */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
        <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:".6rem 1rem",borderBottom:"1px solid var(--border)",fontSize:".75rem",
            color:"var(--success)",letterSpacing:".1em",textTransform:"uppercase",fontWeight:600}}>
            ✓ In ({dayCheckins.length})
          </div>
          {dayCheckins.length===0
            ? <div style={{padding:".75rem 1rem",fontSize:".8rem",color:"var(--gray)"}}>
                {isToday?"None yet":"No check-ins recorded"}
              </div>
            : dayCheckins.map((c,i)=>{
                const a=athletes.find(x=>x.id===c.athleteId);
                return <div key={i} style={{padding:".5rem 1rem",borderBottom:"1px solid var(--bs)",fontSize:".85rem",display:"flex",justifyContent:"space-between"}}>
                  <span>{a?.name?.split(" ")[0]||"?"}</span>
                  <span style={{color:"var(--gray)",fontSize:".75rem"}}>{c.time}</span>
                </div>;
              })}
        </div>
        <div style={{background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:".6rem 1rem",borderBottom:"1px solid var(--border)",fontSize:".75rem",
            color:"var(--danger)",letterSpacing:".1em",textTransform:"uppercase",fontWeight:600}}>
            ✗ Missing ({missing.length})
          </div>
          {missing.length===0
            ? <div style={{padding:".75rem 1rem",fontSize:".8rem",color:"var(--success)"}}>Everyone's in! 🎉</div>
            : missing.map((a,i)=>(
                <div key={i} style={{padding:".5rem 1rem",borderBottom:"1px solid var(--bs)",fontSize:".85rem"}}>
                  {a.name?.split(" ")[0]}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM PR FEED — visible to every athlete on the home screen
// ═══════════════════════════════════════════════════════════════════════════════
function TeamPRFeed({ athletes, logs }) {
  const [days, setDays] = React.useState(7); // 7 or 30

  const recentPRs = (() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toLocaleDateString("en-CA");
    const recentLogs = logs.filter(l => l.date >= cutoffStr && l.weight > 0);

    const found = [];
    const seen = new Set();

    recentLogs.forEach(l => {
      const dayKey = `${l.athleteId}-${l.exerciseName}-${l.date}`;
      if (seen.has(dayKey)) return; seen.add(dayKey);

      const sameDay = recentLogs.filter(x => x.athleteId===l.athleteId && x.exerciseName===l.exerciseName && x.date===l.date);
      const dayBest = Math.max(...sameDay.map(x => calc1RM(x.weight, x.reps)).filter(Boolean));

      const priorLogs = logs.filter(x => x.athleteId===l.athleteId && x.exerciseName===l.exerciseName && x.date < l.date && x.weight > 0);
      const priorMax = priorLogs.length ? Math.max(...priorLogs.map(x => calc1RM(x.weight, x.reps)).filter(Boolean)) : null;

      if (priorMax !== null && dayBest > priorMax) {
        const athlete = athletes.find(a => a.id === l.athleteId);
        found.push({
          athleteId: l.athleteId,
          name: athlete?.name || "Unknown",
          number: athlete?.number,
          exercise: l.exerciseName,
          orm: dayBest,
          prevOrm: priorMax,
          date: l.date,
        });
      }
    });

    return found.sort((a, b) => b.date.localeCompare(a.date)).slice(0, days===7 ? 8 : 20);
  })();

  if (!recentPRs.length && days===7) return (
    <div style={{maxWidth:480, width:"100%", margin:"0 auto 1.75rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
          <span style={{fontSize:"1.1rem"}}>🏆</span>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",fontWeight:700,
            color:"var(--gold)",letterSpacing:".08em",textTransform:"uppercase"}}>Team PRs</span>
        </div>
        <button onClick={()=>setDays(d=>d===7?30:7)}
          style={{background:"transparent",border:"1px solid var(--border)",color:"var(--gray)",
            borderRadius:6,padding:".2rem .6rem",cursor:"pointer",
            fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".75rem"}}>
          {days===7?"Last 7 days":"Last 30 days"}
        </button>
      </div>
      <div style={{fontSize:".85rem",color:"var(--gray)",padding:".5rem 0",textAlign:"center"}}>
        No PRs this week — try switching to 30 days.
      </div>
    </div>
  );

  if (!recentPRs.length) return null;

  return (
    <div style={{maxWidth:480, width:"100%", margin:"0 auto 1.75rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".75rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
          <span style={{fontSize:"1.1rem"}}>🏆</span>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"1rem",fontWeight:700,
            color:"var(--gold)",letterSpacing:".08em",textTransform:"uppercase"}}>
            Team PRs
          </span>
        </div>
        <button onClick={()=>setDays(d=>d===7?30:7)}
          style={{background:days===30?"rgba(232,184,75,.1)":"transparent",
            border:`1px solid ${days===30?"var(--gold)":"var(--border)"}`,
            color:days===30?"var(--gold)":"var(--gray)",
            borderRadius:6,padding:".2rem .6rem",cursor:"pointer",
            fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:".75rem",
            transition:"all .15s"}}>
          {days===7?"This week":"Last 30 days"}
        </button>
      </div>
      <div style={{background:"var(--navy-light)", border:"1px solid var(--border)", borderRadius:12, overflow:"hidden"}}>
        {recentPRs.map((pr, i) => {
          const gain = pr.orm - pr.prevOrm;
          return (
            <div key={i} style={{display:"flex", alignItems:"center", gap:".75rem",
              padding:".75rem 1rem", borderBottom: i < recentPRs.length-1 ? "1px solid var(--bs)" : "none"}}>
              <div style={{width:34, height:34, borderRadius:"50%", background:"rgba(245,158,11,.15)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"1.1rem"}}>
                🏆
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:".9rem", fontWeight:600}}>
                  {pr.name}{pr.number ? <span style={{color:"var(--gray)", fontWeight:400}}> #{pr.number}</span> : ""}
                </div>
                <div style={{fontSize:".78rem", color:"var(--gray)"}}>{pr.exercise}
                  {days===30 && <span style={{color:"var(--gray)",marginLeft:".4rem"}}>· {fmtDate(pr.date)}</span>}
                </div>
              </div>
              <div style={{textAlign:"right", flexShrink:0}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:"1rem", color:"#f59e0b"}}>
                  ~{pr.orm} lb
                </div>
                <div style={{fontSize:".68rem", color:"var(--success)"}}>+{gain} lb</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ROUTINES TAB — save warmup / core / stretch blocks to insert into any workout
// ═══════════════════════════════════════════════════════════════════════════════
function RoutinesTab({ library, setLibrary, routines, saveRoutines }) {
  const [editing, setEditing]     = useState(false);
  const [editIdx, setEditIdx]     = useState(null); // null = new routine
  const [form, setForm]           = useState({ name: "", category: "Warmup", blocks: [] });
  const [showPicker, setShowPicker] = useState(false);
  const [saved, setSaved]         = useState(false);

  const CATEGORIES = ["Warmup", "Core", "Cooldown / Stretch", "Other"];

  const openNew = () => {
    setForm({ name: "", category: "Warmup", blocks: [] });
    setEditIdx(null);
    setEditing(true);
  };

  const openEdit = (r, i) => {
    setForm({ ...r, blocks: r.blocks.map(b => ({ ...b })) });
    setEditIdx(i);
    setEditing(true);
  };

  const saveRoutine = () => {
    if (!form.name.trim() || !form.blocks.length) return;
    let updated;
    if (editIdx !== null) {
      updated = routines.map((r, i) => i === editIdx ? { ...form } : r);
    } else {
      updated = [...routines, { ...form, id: `rt${Date.now()}` }];
    }
    saveRoutines(updated);
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 700);
  };

  const deleteRoutine = (i) => {
    saveRoutines(routines.filter((_, ri) => ri !== i));
    setEditing(false);
  };

  const addBlock = (ex) => {
    setForm(f => ({
      ...f,
      blocks: [...f.blocks, {
        label: String.fromCharCode(65 + f.blocks.length),
        exerciseId: ex.id,
        sets: 2, reps: "20", notes: "", pcts: ""
      }]
    }));
    setShowPicker(false);
  };

  const updateBlock = (i, field, val) =>
    setForm(f => ({ ...f, blocks: f.blocks.map((b, bi) => bi===i ? {...b,[field]:val} : b) }));

  const removeBlock = (i) =>
    setForm(f => ({ ...f, blocks: f.blocks.filter((_,bi)=>bi!==i).map((b,bi)=>({...b,label:String.fromCharCode(65+bi)})) }));

  if (editing) return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
        <div className="section-title" style={{margin:0}}>{editIdx!==null?"Edit":"New"} Routine</div>
        <button className="back-btn" onClick={()=>setEditing(false)}>← Cancel</button>
      </div>

      <div className="builder-form">
        <div className="form-row">
          <div className="form-field" style={{flex:2}}>
            <label>Routine Name</label>
            <input className="form-input" placeholder="e.g. Upper Body Warmup"
              value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
          </div>
          <div className="form-field" style={{flex:1}}>
            <label>Category</label>
            <select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {form.blocks.length > 0 && (
        <div style={{marginBottom:"1rem"}}>
          {form.blocks.map((blk, i) => {
            const ex = library.find(e=>e.id===blk.exerciseId);
            return (
              <div key={i} style={{background:"var(--navy-light)",border:"1px solid var(--border)",
                borderRadius:10,padding:".875rem 1rem",marginBottom:".5rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:".5rem"}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,
                    fontSize:".9rem",color:"var(--gold)",width:28,height:28,border:"2px solid var(--gold)",
                    borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {blk.label}
                  </div>
                  <div style={{flex:1,fontWeight:600,fontSize:".9rem"}}>{ex?.name||"Unknown"}</div>
                  <div style={{display:"flex",gap:4}}>
                    <button style={{background:"transparent",border:"none",color:"var(--gray)",cursor:"pointer",fontSize:".8rem",padding:"2px 6px"}}
                      onClick={()=>setForm(f=>{if(i===0)return f;const b=[...f.blocks];[b[i-1],b[i]]=[b[i],b[i-1]];return{...f,blocks:b};})}>▲</button>
                    <button style={{background:"transparent",border:"none",color:"var(--gray)",cursor:"pointer",fontSize:".8rem",padding:"2px 6px"}}
                      onClick={()=>setForm(f=>{if(i===f.blocks.length-1)return f;const b=[...f.blocks];[b[i],b[i+1]]=[b[i+1],b[i]];return{...f,blocks:b};})}>▼</button>
                  </div>
                  <button className="danger-btn" onClick={()=>removeBlock(i)}>✕</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                  <div>
                    <label style={{fontSize:".65rem",color:"var(--gray)",letterSpacing:".08em",textTransform:"uppercase",display:"block",marginBottom:".25rem"}}>Sets</label>
                    <input className="form-input" type="number" min={1} max={20} value={blk.sets}
                      onChange={e=>updateBlock(i,"sets",parseInt(e.target.value)||1)}
                      style={{textAlign:"center"}}/>
                  </div>
                  <div>
                    <label style={{fontSize:".65rem",color:"var(--gray)",letterSpacing:".08em",textTransform:"uppercase",display:"block",marginBottom:".25rem"}}>Reps</label>
                    <input className="form-input" value={blk.reps}
                      onChange={e=>updateBlock(i,"reps",e.target.value)}
                      placeholder="e.g. 20"/>
                  </div>
                </div>
                <input className="form-input" placeholder="Note (optional)" value={blk.notes}
                  onChange={e=>updateBlock(i,"notes",e.target.value)}
                  style={{marginTop:".5rem",fontSize:".85rem"}}/>
              </div>
            );
          })}
        </div>
      )}

      <button className="ghost-btn" style={{marginBottom:"1.5rem"}} onClick={()=>setShowPicker(true)}>
        + Add Exercise
      </button>

      <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        <button className="gold-btn" onClick={saveRoutine}
          disabled={!form.name.trim()||!form.blocks.length}>
          {saved ? "✓ Saved!" : "Save Routine"}
        </button>
        {editIdx!==null && (
          <button className="back-btn" style={{color:"var(--danger)",borderColor:"var(--danger)"}}
            onClick={()=>deleteRoutine(editIdx)}>
            Delete
          </button>
        )}
      </div>

      {showPicker && (
        <ExercisePicker library={library} setLibrary={setLibrary} onSelect={addBlock} onClose={()=>setShowPicker(false)}/>
      )}
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
        <div>
          <div className="section-title" style={{margin:0}}>Saved Routines</div>
          <div style={{fontSize:".8rem",color:"var(--gray)",marginTop:".2rem"}}>
            Warmups, core blocks, and stretches — insert into any workout in one tap
          </div>
        </div>
        <button className="gold-btn" onClick={openNew}>+ New</button>
      </div>

      {(!routines||routines.length===0) ? (
        <div style={{textAlign:"center",padding:"2.5rem 1rem",color:"var(--gray)",
          background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12}}>
          <div style={{fontSize:"1.5rem",marginBottom:".75rem"}}>⚡</div>
          <div style={{fontWeight:600,marginBottom:".4rem"}}>No routines saved yet</div>
          <div style={{fontSize:".85rem"}}>Create your first one — Upper Warmup, Core Block, etc. — then insert it into any workout in one tap.</div>
        </div>
      ) : (
        <div>
          {routines.map((r, i) => {
            const exNames = (r.blocks||[]).map(b=>{
              const ex = library.find(e=>e.id===b.exerciseId);
              return ex?.name||"?";
            });
            return (
              <div key={i} style={{background:"var(--navy-light)",border:"1px solid var(--border)",
                borderRadius:12,padding:"1rem 1.25rem",marginBottom:".75rem",cursor:"pointer"}}
                onClick={()=>openEdit(r, i)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:"1.15rem"}}>
                      {r.name}
                    </div>
                    <div style={{fontSize:".72rem",color:"var(--gold)",letterSpacing:".08em",
                      textTransform:"uppercase",fontWeight:600,marginTop:".15rem"}}>
                      {r.category}
                    </div>
                  </div>
                  <div style={{fontSize:".8rem",color:"var(--gray)"}}>
                    {r.blocks?.length} exercises · Edit ›
                  </div>
                </div>
                <div style={{marginTop:".5rem",display:"flex",flexWrap:"wrap",gap:".35rem"}}>
                  {exNames.map((name,j)=>(
                    <span key={j} style={{fontSize:".75rem",background:"var(--navy)",
                      border:"1px solid var(--border)",borderRadius:5,padding:".15rem .5rem",color:"var(--gray)"}}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUPS TAB — create and manage player groups for workout assignment
// ═══════════════════════════════════════════════════════════════════════════════
function GroupsTab({ athletes, groups, saveGroups }) {
  const [editing,    setEditing]   = useState(false);
  const [editIdx,    setEditIdx]   = useState(null);
  const [form,       setForm]      = useState({ name: "", athleteIds: [] });
  const [saved,      setSaved]     = useState(false);

  const openNew = () => {
    setForm({ name: "", athleteIds: [] });
    setEditIdx(null);
    setEditing(true);
  };

  const openEdit = (g, i) => {
    setForm({ name: g.name, athleteIds: [...(g.athleteIds||[])] });
    setEditIdx(i);
    setEditing(true);
  };

  const toggleAthlete = (id) => {
    setForm(f => ({
      ...f,
      athleteIds: f.athleteIds.includes(id)
        ? f.athleteIds.filter(x => x !== id)
        : [...f.athleteIds, id]
    }));
  };

  const saveGroup = () => {
    if (!form.name.trim()) return;
    const entry = { id: editIdx !== null ? groups[editIdx].id : `grp${Date.now()}`, ...form };
    const updated = editIdx !== null
      ? groups.map((g, i) => i === editIdx ? entry : g)
      : [...groups, entry];
    saveGroups(updated);
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 700);
  };

  const deleteGroup = (i) => {
    saveGroups(groups.filter((_, gi) => gi !== i));
    setEditing(false);
  };

  if (editing) return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
        <div className="section-title" style={{margin:0}}>{editIdx!==null?"Edit":"New"} Group</div>
        <button className="back-btn" onClick={()=>setEditing(false)}>← Cancel</button>
      </div>
      <div className="form-field" style={{marginBottom:"1.25rem"}}>
        <label>Group Name</label>
        <input className="form-input" placeholder="e.g. Rotation, Freshmen, Post Players"
          value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
      </div>
      <div style={{fontSize:".75rem",color:"var(--gold)",letterSpacing:".08em",
        textTransform:"uppercase",fontWeight:600,marginBottom:".75rem"}}>
        Players in this group
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:".4rem",marginBottom:"1.5rem"}}>
        {(athletes||[]).sort((a,b)=>parseInt(a.number)-parseInt(b.number)).map(a=>{
          const sel = form.athleteIds.includes(a.id);
          return (
            <div key={a.id} onClick={()=>toggleAthlete(a.id)}
              style={{display:"flex",alignItems:"center",gap:".875rem",padding:".75rem 1rem",
                borderRadius:10,cursor:"pointer",
                background:sel?"rgba(232,184,75,.08)":"var(--navy-light)",
                border:`1px solid ${sel?"var(--gold)":"var(--border)"}`}}>
              <div style={{width:22,height:22,borderRadius:5,
                border:`2px solid ${sel?"var(--gold)":"var(--border)"}`,
                background:sel?"var(--gold)":"transparent",flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:".75rem",color:"var(--navy)",fontWeight:900}}>
                {sel?"✓":""}
              </div>
              <div className="athlete-number" style={{width:28,height:28,fontSize:".75rem",flexShrink:0}}>
                #{a.number}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:".9rem"}}>{a.name}</div>
                <div style={{fontSize:".75rem",color:"var(--gray)"}}>{a.position} · {a.year}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        <button className="gold-btn" disabled={!form.name.trim()} onClick={saveGroup}>
          {saved ? "✓ Saved!" : `Save Group (${form.athleteIds.length} players)`}
        </button>
        {editIdx !== null && (
          <button className="back-btn" style={{color:"var(--danger)",borderColor:"var(--danger)"}}
            onClick={()=>deleteGroup(editIdx)}>Delete</button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
        <div>
          <div className="section-title" style={{margin:0}}>Player Groups</div>
          <div style={{fontSize:".8rem",color:"var(--gray)",marginTop:".2rem"}}>
            Group players to assign different workouts to different rosters
          </div>
        </div>
        <button className="gold-btn" onClick={openNew}>+ New Group</button>
      </div>

      {(!groups||!groups.length) ? (
        <div style={{textAlign:"center",padding:"2.5rem 1rem",color:"var(--gray)",
          background:"var(--navy-light)",border:"1px solid var(--border)",borderRadius:12}}>
          <div style={{fontSize:"1.75rem",marginBottom:".75rem"}}>👥</div>
          <div style={{fontWeight:600,marginBottom:".4rem"}}>No groups yet</div>
          <div style={{fontSize:".85rem",lineHeight:1.5}}>
            Create groups like "Rotation", "Freshmen", or "Post Players" to assign
            different workouts to different players on the same day.
          </div>
        </div>
      ) : (
        <div>
          {groups.map((g, i) => {
            const members = (athletes||[]).filter(a=>(g.athleteIds||[]).includes(a.id));
            return (
              <div key={g.id} style={{background:"var(--navy-light)",border:"1px solid var(--border)",
                borderRadius:12,padding:"1rem 1.25rem",marginBottom:".75rem",cursor:"pointer"}}
                onClick={()=>openEdit(g, i)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".5rem"}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,fontSize:"1.15rem"}}>
                    {g.name}
                  </div>
                  <div style={{fontSize:".8rem",color:"var(--gray)"}}>
                    {members.length} player{members.length!==1?"s":""} · Edit ›
                  </div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:".35rem"}}>
                  {members.sort((a,b)=>parseInt(a.number)-parseInt(b.number)).map(a=>(
                    <span key={a.id} style={{fontSize:".75rem",background:"var(--navy)",
                      border:"1px solid var(--border)",borderRadius:5,padding:".15rem .5rem",
                      color:"var(--gray)"}}>
                      #{a.number} {a.name?.split(" ")[0]}
                    </span>
                  ))}
                  {!members.length && <span style={{fontSize:".8rem",color:"var(--gray)",fontStyle:"italic"}}>No players assigned</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
