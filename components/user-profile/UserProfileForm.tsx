"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const ALL_INTERESTS = [
  "Travel","Music","Movies","Sports",
  "Food","Art","Reading","Gaming",
  "Fitness","Photography","Cooking","Dancing",
  "Nature","Technology","Fashion","Pets",
];

const DEAL_BREAKERS = [
  "Smoking","Drinking","Pets","Kids",
  "Different religion","Different politics","Long distance","Age gap",
];

type RelationshipGoal = "Long-term relationship" | "Short-term fun" | "New friends" | "Something casual";
const GOALS: RelationshipGoal[] = [
  "Long-term relationship",
  "Short-term fun",
  "New friends",
  "Something casual",
];

export default function UserProfileForm({ onSaved }: { onSaved?: () => void }) {
  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("female");

  // Step 2
  const [interests, setInterests] = useState<string[]>([]);

  // Step 3
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Step 4
  const [interestedIn, setInterestedIn] = useState<'men'|'women'|'everyone'>("everyone");
  const [ageRange, setAgeRange] = useState<number[]>([18, 35]);
  const [maxDistance, setMaxDistance] = useState<number[]>([50]);
  const [goals, setGoals] = useState<RelationshipGoal[]>([]);

  // Step 5
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const interestsCount = interests.length;
  const canSubmit = useMemo(() => {
    return firstName && lastName && email && gender && interestsCount >= 3 && photos.length >= 2;
  }, [firstName, lastName, email, gender, interestsCount, photos.length]);

  const toggle = (val: string, list: string[], setList: (v: string[]) => void, max?: number) => {
    const exists = list.includes(val);
    if (exists) setList(list.filter((x) => x !== val));
    else if (!max || list.length < max) setList([...list, val]);
  };

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 2400); };

  const handlePhotoUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads/user-photo", { method: "POST", body: form });
      const data = await res.json();
      if (data?.ok && data.url) setPhotos((prev) => [...prev, data.url].slice(0, 6));
      else showToast(data?.error || "Upload failed");
    } catch (e: any) {
      showToast(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const progress = useMemo(() => {
    let p = 0;
    if (firstName && lastName && email && gender && birthDate) p += 35;
    if (interests.length >= 3) p += 25;
    if (photos.length >= 2) p += 25;
    if (goals.length || interestedIn) p += 15;
    return Math.min(100, p);
  }, [firstName, lastName, email, gender, birthDate, interests.length, photos.length, goals.length, interestedIn]);

  const onSubmit = async () => {
    if (saving || !canSubmit) { if (!canSubmit) showToast("Fill required fields"); return; }
    try {
      setSaving(true);
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        birthday: birthDate,
        gender,
        interest: interests,
        photos: { main: photos[0] || null, gallery: photos },
        interestedIn,
      };
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data?.ok) {
        showToast("Saved user profile");
        onSaved?.();
      } else {
        showToast(data?.error || "Save failed");
      }
    } catch (e: any) {
      showToast(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-6">
      {toastMsg && (
        <div className="fixed right-4 bottom-4 z-50 bg-black/80 text-white text-sm px-4 py-2 rounded-md shadow-md">{toastMsg}</div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Create your profile</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Complete your profile in a few quick steps</p>
        </div>
        <Button onClick={onSubmit} disabled={!canSubmit || saving} className="bg-gradient-to-r from-[#E17CFD] to-[#8950FC] hover:from-[#E17CFD]/90 hover:to-[#8950FC]/90 text-white px-5 py-2 rounded-[10px]">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="h-2 w-full bg-gray-200/70 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#E17CFD] to-[#8950FC] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">{progress}% complete</div>
      </div>

      {/* Basic Info */}
      <section className="p-0 bg-transparent border-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex flex-col gap-2">
            <label className="form-label">First Name</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" className="h-[42px]" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="form-label">Last Name</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" className="h-[42px]" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="form-label">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-[42px]" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="form-label">Birth Date</label>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="h-[42px]" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="form-label">Gender</label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="h-[42px]">
                <SelectValue placeholder="Select Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="binary">Non-binary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Interests */}
      <section className="mt-6 p-0 bg-transparent border-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base md:text-lg font-semibold">Your Interests</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Pick at least 3 ({interests.length}/16 selected)</p>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 md:gap-3">
          {ALL_INTERESTS.map((i) => {
            const active = interests.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(i, interests, setInterests)}
                className={`w-full min-h-[44px] rounded-xl border px-4 py-2 flex items-center justify-center text-center transition text-sm ${active ? 'bg-[#8950FC] text-white border-[#8950FC] shadow-sm' : 'bg-white text-black border-[rgba(113,102,249,0.35)] hover:border-[#8950FC]/50'}`}
              >
                {i}
              </button>
            );
          })}
        </div>
      </section>

      {/* Photos */}
      <section className="mt-6 p-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base md:text-lg font-semibold">Add Your Photos</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Add at least 2 photos ({photos.length}/6)</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[0,1,2,3,4,5].map((idx) => (
            <label key={idx} className={`rounded-2xl aspect-[4/3] flex items-center justify-center border cursor-pointer overflow-hidden ${photos[idx] ? 'p-0' : 'p-4'} ${idx===0 ? 'ring-2 ring-[#E17CFD]' : ''}`}>
              {photos[idx] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos[idx]} alt={`photo-${idx}`} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-sm text-muted-foreground">{idx===0 ? 'Main Photo' : 'Add Photo'}</div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files?.[0] || undefined)} />
            </label>
          ))}
        </div>
        <div className="text-xs mt-3 text-muted-foreground">
          {uploading ? 'Uploading...' : 'Tip: Use clear, high-quality photos. Avoid group photos for the main image.'}
        </div>
      </section>

      {/* Preferences */}
      <section className="mt-6 p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-2 text-base font-semibold">I'm interested in</div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
              {(['men','women','everyone'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setInterestedIn(v)} className={`w-full rounded-xl border px-4 py-2 min-h-[44px] flex items-center justify-center text-center text-sm ${interestedIn===v ? 'bg-[#8950FC] text-white border-[#8950FC]' : 'bg-white border-[rgba(113,102,249,0.35)] hover:border-[#8950FC]/50'}`}>{v[0].toUpperCase()+v.slice(1)}</button>
              ))}
            </div>
            <div className="mt-6">
              <div className="mb-2 text-base font-semibold">Age Range</div>
              <div className="text-xs md:text-sm mb-1">{ageRange[0]} - {ageRange[1]} years old</div>
              <Slider value={ageRange} onValueChange={setAgeRange} min={18} max={60} step={1} className="w-full [&_.slider-range]:bg-[#8950FC]" />
            </div>
          </div>
          <div>
            <div className="mb-2 text-base font-semibold">Maximum Distance</div>
            <div className="text-xs md:text-sm mb-1">{maxDistance[0]} km away</div>
            <Slider value={maxDistance} onValueChange={setMaxDistance} min={1} max={200} step={1} className="w-full [&_.slider-range]:bg-[#8950FC]" />
            <div className="mt-6 mb-2 text-base font-semibold">I'm looking for</div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
              {GOALS.map((g) => {
                const active = goals.includes(g);
                return (
                  <button key={g} type="button" onClick={() => toggle(g, goals, (v)=>setGoals(v as RelationshipGoal[]))} className={`w-full rounded-xl border px-4 py-2 min-h-[44px] flex items-center justify-center text-center text-sm ${active ? 'bg-[#8950FC] text-white border-[#8950FC]' : 'bg-white border-[rgba(113,102,249,0.35)] hover:border-[#8950FC]/50'}`}>{g}</button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Deal Breakers */}
      <section className="mt-6 p-0">
        <h3 className="text-base md:text-lg font-semibold">Deal Breakers (Optional)</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2 md:gap-3 mt-3">
          {DEAL_BREAKERS.map((d) => {
            const active = dealBreakers.includes(d);
            return (
              <button key={d} type="button" onClick={() => toggle(d, dealBreakers, setDealBreakers)} className={`w-full min-h-[40px] rounded-full px-4 py-2 border text-xs md:text-sm text-center flex items-center justify-center ${active ? 'bg-[#8950FC] text-white border-[#8950FC]' : 'bg-white text-black border-[rgba(113,102,249,0.35)] hover:border-[#8950FC]/50'}`}>
                {d}
              </button>
            );
          })}
        </div>
      </section>

      {/* Footer action on full width */}
      <div className="flex justify-end mt-6">
        <Button onClick={onSubmit} disabled={!canSubmit || saving} className="bg-gradient-to-r from-[#E17CFD] to-[#8950FC] hover:from-[#E17CFD]/90 hover:to-[#8950FC]/90 text-white px-6 py-2 rounded-[10px]">
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
