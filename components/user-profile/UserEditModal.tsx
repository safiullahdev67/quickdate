"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface UserEditModalProps {
  open: boolean;
  userId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

type RelationshipGoal = "Long-term relationship" | "Short-term fun" | "New friends" | "Something casual";

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

const GOALS: RelationshipGoal[] = [
  "Long-term relationship",
  "Short-term fun",
  "New friends",
  "Something casual",
];

export function UserEditModal({ open, userId, onClose, onSaved }: UserEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("female");

  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [interestedIn, setInterestedIn] = useState<'men'|'women'|'everyone'>("everyone");
  const [ageRange, setAgeRange] = useState<number[]>([18, 35]);
  const [maxDistance, setMaxDistance] = useState<number[]>([50]);
  const [goals, setGoals] = useState<RelationshipGoal[]>([]);
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);

  const progress = useMemo(() => {
    let p = 0;
    if (firstName && lastName && email && gender && birthDate) p += 35;
    if (interests.length >= 3) p += 25;
    if (photos.length >= 2) p += 25;
    if (goals.length || interestedIn) p += 15;
    return Math.min(100, p);
  }, [firstName, lastName, email, gender, birthDate, interests.length, photos.length, goals.length, interestedIn]);

  const toggle = (val: string, list: string[], setList: (v: string[]) => void, max?: number) => {
    const exists = list.includes(val);
    if (exists) setList(list.filter((x) => x !== val));
    else if (!max || list.length < max) setList([...list, val]);
  };

  const toDateInput = (d: any) => {
    try {
      if (!d) return "";
      if (typeof d === "string") return d.slice(0, 10);
      // Firestore Timestamp (admin)
      if (d?.toDate) return new Date(d.toDate()).toISOString().slice(0, 10);
      if (typeof d._seconds === "number") return new Date(d._seconds * 1000).toISOString().slice(0, 10);
      return "";
    } catch { return ""; }
  };

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (data?.ok && data.item) {
          const it = data.item;
          setFirstName(String((it.first_name ?? it.firstName) || ""));
          setLastName(String((it.last_name ?? it.lastName) || ""));
          setEmail(String(it.email || ""));
          setGender(String(it.gender || "female"));
          setBirthDate(toDateInput(it.birthday ?? it.birthDate));
          const ints = Array.isArray(it.interests) ? it.interests.map(String) : (Array.isArray(it.interest) ? it.interest.map(String) : []);
          setInterests(ints);
          const gal = Array.isArray(it.photos?.gallery) ? it.photos.gallery.map(String) : (Array.isArray(it.photos) ? it.photos.map(String) : []);
          setPhotos(gal.slice(0, 6));
          const pref = it.preferences || {};
          setInterestedIn((it.interestedIn as any) ?? (pref.interestedIn as any) ?? "everyone");
          const min = Number(pref?.ageRange?.min ?? 18);
          const max = Number(pref?.ageRange?.max ?? 35);
          setAgeRange([min, max]);
          setMaxDistance([Number(pref?.maxDistanceKm ?? 50)]);
          setGoals(Array.isArray(pref?.goals) ? pref.goals as RelationshipGoal[] : []);
          setDealBreakers(Array.isArray(pref?.dealBreakers) ? pref.dealBreakers.map(String) : []);
        }
      } catch {}
      setLoading(false);
    })();
  }, [open, userId]);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 2000); };

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

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      const payload: Record<string, any> = {
        firstName,
        lastName,
        email,
        birthDate,
        gender,
        interests,
        photos: { main: photos[0] || null, gallery: photos },
        preferences: {
          interestedIn,
          ageRange: { min: ageRange[0], max: ageRange[1] },
          maxDistanceKm: maxDistance[0] || 0,
          goals,
          dealBreakers,
        },
      };
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        showToast("User updated");
        onSaved?.();
        onClose();
      } else {
        showToast(data?.error || "Failed to update");
      }
    } catch (e: any) {
      showToast(e?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-5xl bg-white rounded-2xl p-4 md:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {toastMsg && (
          <div className="mb-3 text-sm text-white bg-black/80 rounded px-3 py-2 inline-block">{toastMsg}</div>
        )}
        <div className="flex items-center justify-between mb-4">
          <h3 className="heading-small text-black text-[18px]">Edit User</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="mb-5">
              <div className="h-2 w-full bg-gray-200/70 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#E17CFD] to-[#8950FC] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{progress}% complete</div>
            </div>

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

            <section className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base md:text-lg font-semibold">Interests</h3>
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

            <section className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base md:text-lg font-semibold">Photos</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Add at least 2 photos ({photos.length}/6)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[0,1,2,3,4,5].map((idx) => (
                  <div key={idx} className={`rounded-2xl aspect-[4/3] flex items-center justify-center border overflow-hidden relative ${photos[idx] ? 'p-0' : 'p-4'} ${idx===0 ? 'ring-2 ring-[#E17CFD]' : ''}`}>
                    {photos[idx] ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photos[idx]} alt={`photo-${idx}`} className="w-full h-full object-cover" />
                        <button type="button" className="absolute top-1 right-1 text-xs bg-black/70 text-white px-2 py-1 rounded" onClick={() => removePhoto(idx)}>Remove</button>
                      </>
                    ) : (
                      <label className="w-full h-full flex items-center justify-center cursor-pointer">
                        <div className="text-center text-sm text-muted-foreground">{idx===0 ? 'Main Photo' : 'Add Photo'}</div>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files?.[0] || undefined)} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs mt-3 text-muted-foreground">
                {uploading ? 'Uploading...' : 'Tip: Use clear, high-quality photos. Avoid group photos for the main image.'}
              </div>
            </section>

            <section className="mt-6">
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

            <section className="mt-6">
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
          </>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
