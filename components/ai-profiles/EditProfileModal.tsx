"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

interface EditProfileModalProps {
  open: boolean;
  profileId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditProfileModal({ open, profileId, onClose, onSaved }: EditProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [interests, setInterests] = useState("");
  const [profileQuality, setProfileQuality] = useState("high");
  const [ageRange, setAgeRange] = useState("18-25");
  const [messagesPerDay, setMessagesPerDay] = useState<number[]>([5]);
  const [likesPerDay, setLikesPerDay] = useState<number[]>([25]);
  const [matchesPerWeek, setMatchesPerWeek] = useState("10");
  const [expireAfter, setExpireAfter] = useState("30");
  const [autoRegenerate, setAutoRegenerate] = useState(false);
  const [contentFileUrl, setContentFileUrl] = useState<string | null>(null);

  const [countries, setCountries] = useState<Array<{ code: string; name: string }>>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/locations/countries");
        const data = await res.json();
        if (!active) return;
        if (data?.ok && Array.isArray(data.items)) setCountries(data.items);
      } catch {}
    })();
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open || !profileId) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/ai-profiles/${encodeURIComponent(profileId)}`);
        const data = await res.json();
        if (data?.ok && data.item) {
          const it = data.item;
          setName(String(it.name || ""));
          setGender(String(it.gender || "male"));
          setInterests(Array.isArray(it.interests) ? String(it.interests[0] || "") : String(it.interests || ""));
          // Map stored quality back to UI options
          const q = String(it.profileQuality || "high");
          setProfileQuality(q === "very_good" ? "high" : q === "bad" ? "low" : q);
          const min = it.age?.min ?? 18;
          const max = it.age?.max ?? 25;
          setAgeRange(`${min}-${max}`);
          setMessagesPerDay([Number(it.messagesPerDay ?? 5)]);
          setLikesPerDay([Number(it.likesPerDay ?? 25)]);
          setMatchesPerWeek(String(it.matchesPerWeek ?? 10));
          setExpireAfter(String(it.expireAfterDays ?? 30));
          setAutoRegenerate(Boolean(it.autoRegenerate));
          setContentFileUrl(it.content?.fileUrl || null);
          const country = String(it.location?.country || "");
          const city = String(it.location?.city || "");
          setSelectedCountry(country);
          setSelectedCity(city);
        }
      } catch {}
      setLoading(false);
    })();
  }, [open, profileId]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!selectedCountry) return;
      try {
        const res = await fetch(`/api/locations/cities?country=${encodeURIComponent(selectedCountry)}`);
        const data = await res.json();
        if (!active) return;
        if (data?.ok && Array.isArray(data.items)) {
          const list = data.items.map((it: any) => it.name || String(it));
          setCities(list);
          if (!selectedCity && list.length) setSelectedCity(list[0]);
        }
      } catch {
        setCities([]);
      }
    })();
    return () => { active = false; };
  }, [selectedCountry]);

  const handleUpload = async (e: any) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads/ai-profile", { method: "POST", body: form });
      const data = await res.json();
      if (data?.ok && data.url) setContentFileUrl(data.url);
    } catch {}
  };

  const save = async () => {
    if (!profileId) return;
    try {
      setSaving(true);
      const [a, b] = String(ageRange).split("-");
      const body: any = {
        name,
        gender,
        interests,
        profileQuality,
        ageMin: parseInt(a || "18", 10),
        ageMax: parseInt(b || "60", 10),
        country: selectedCountry,
        city: selectedCity,
        messagesPerDay: messagesPerDay?.[0] ?? 5,
        likesPerDay: likesPerDay?.[0] ?? 25,
        matchesPerWeek: parseInt(matchesPerWeek || "10", 10),
        expireAfter: parseInt(expireAfter || "30", 10),
        autoRegenerate,
        contentSource: "custom",
      };
      if (contentFileUrl) body.contentFileUrl = contentFileUrl;
      const res = await fetch(`/api/ai-profiles/${encodeURIComponent(profileId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data?.ok) {
        setToastMsg("Profile updated");
        setTimeout(() => setToastMsg(""), 2000);
        onSaved?.();
        onClose();
      } else {
        setToastMsg(data?.error || "Failed to update");
        setTimeout(() => setToastMsg(""), 2500);
      }
    } catch (e: any) {
      setToastMsg(e?.message || "Failed to update");
      setTimeout(() => setToastMsg(""), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl bg-white rounded-2xl p-4 md:p-6 shadow-xl">
        {toastMsg && (
          <div className="mb-3 text-sm text-white bg-black/80 rounded px-3 py-2 inline-block">{toastMsg}</div>
        )}
        <div className="flex items-center justify-between mb-4">
          <h3 className="heading-small text-black text-[18px]">Edit Profile</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="form-label">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-[44px] rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] shadow-none" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="form-label">Gender</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="binary">Binary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="form-label">Interests</label>
              <Select value={interests} onValueChange={setInterests}>
                <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="form-label">Profile Quality</label>
              <Select value={profileQuality} onValueChange={setProfileQuality}>
                <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between"><label className="slider-label">Messages per day</label><span className="slider-value">{messagesPerDay[0]}/day</span></div>
              <Slider value={messagesPerDay} onValueChange={setMessagesPerDay} max={20} step={1} className="w-full [&_.slider-track]:bg-gray-200 [&_.slider-range]:bg-primary-purple [&_[role=slider]]:bg-primary-purple [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:rounded-full" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between"><label className="slider-label">Likes per day</label><span className="slider-value">{likesPerDay[0]}/day</span></div>
              <Slider value={likesPerDay} onValueChange={setLikesPerDay} max={50} step={1} className="w-full [&_.slider-track]:bg-gray-200 [&_.slider-range]:bg-primary-purple [&_[role=slider]]:bg-primary-purple [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:rounded-full" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="form-label">Matches per week</label>
              <Select value={matchesPerWeek} onValueChange={setMatchesPerWeek}>
                <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="form-label">Age Range</label>
              <Select value={ageRange} onValueChange={setAgeRange}>
                <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="18-25">18 - 25</SelectItem>
                  <SelectItem value="26-35">26 - 35</SelectItem>
                  <SelectItem value="36-45">36 - 45</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="form-label">Country</label>
              <Select value={selectedCountry} onValueChange={(v) => { setSelectedCountry(v); setSelectedCity(""); }}>
                <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="form-label">City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="form-label">Expire after</label>
              <Select value={expireAfter} onValueChange={setExpireAfter}>
                <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 mt-1">
                <Checkbox id="edit-auto" checked={autoRegenerate} onCheckedChange={(c) => setAutoRegenerate(Boolean(c))} />
                <label htmlFor="edit-auto" className="form-label">Auto-regenerate after expiry</label>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="form-label">Content (Custom)</label>
              <Input type="file" accept="image/*" onChange={handleUpload} className="h-[44px] rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] shadow-none" />
              {contentFileUrl && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-600">Current file:</span>
                  <img src={contentFileUrl} alt="Current" className="h-12 w-12 object-cover rounded" />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
