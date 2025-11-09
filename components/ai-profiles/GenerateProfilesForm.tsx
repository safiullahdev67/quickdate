"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import RobotFormIcon from "@/components/icons/RobotFormIcon";
 

export function GenerateProfilesForm({ onCreated }: { onCreated?: () => void }) {
  const [messagesPerDay, setMessagesPerDay] = useState([5]);
  const [likesPerDay, setLikesPerDay] = useState([25]);
  const [autoRegenerate, setAutoRegenerate] = useState(false);

  // Location state (wired to Firestore-backed APIs)
  const [countries, setCountries] = useState<Array<{ code: string; name: string }>>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");

  // Content source and file upload
  const [contentSource, setContentSource] = useState<string>("custom");
  const [uploading, setUploading] = useState<boolean>(false);
  const [contentFileUrl, setContentFileUrl] = useState<string | null>(null);

  // Other form states (keep UI intact; just capture values)
  const [profileName, setProfileName] = useState<string>("");
  const [gender, setGender] = useState<string>("male");
  const [interests, setInterests] = useState<string>("");
  const [profileQuality, setProfileQuality] = useState<string>("high");
  const [matchesPerWeek, setMatchesPerWeek] = useState<string>("10");
  const [ageRange, setAgeRange] = useState<string>("18-25");
  const [expireAfter, setExpireAfter] = useState<string>("30");
  const [numberOfProfiles, setNumberOfProfiles] = useState<string>("321");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/locations/countries");
        const data = await res.json();
        if (!active) return;
        if (data?.ok && Array.isArray(data.items)) {
          setCountries(data.items);
          if (!selectedCountry) {
            setSelectedCountry(data.items[0]?.code || "");
          }
        }
      } catch {
        // Fallback minimal list if API fails
        const fallback = [
          { code: "DE", name: "Germany" },
          { code: "US", name: "United States" },
          { code: "GB", name: "United Kingdom" },
        ];
        setCountries(fallback);
        if (!selectedCountry) setSelectedCountry(fallback[0].code);
      }
    })();
    return () => { active = false; };
  }, []);

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
        // Do not use unrelated fallback cities; keep empty for the selected country
        setCities([]);
        if (selectedCity) setSelectedCity("");
      }
    })();
    return () => { active = false; };
  }, [selectedCountry]);

  const handleFileChange = async (e: any) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads/ai-profile", { method: "POST", body: form });
      const data = await res.json();
      if (data?.ok && data.url) {
        setContentFileUrl(data.url);
      }
    } catch {
      // silent fail; keep UI intact
    } finally {
      setUploading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg("") , 2500);
  };

  const handleGenerate = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const [ageMinStr, ageMaxStr] = String(ageRange).split("-");
      const body = {
        name: profileName,
        numberOfProfiles: Math.max(1, parseInt(String(numberOfProfiles || "1"), 10) || 1),
        gender,
        interests,
        profileQuality,
        ageRange,
        ageMin: parseInt(ageMinStr || "18", 10),
        ageMax: parseInt(ageMaxStr || "60", 10),
        country: selectedCountry,
        city: selectedCity,
        messagesPerDay: messagesPerDay?.[0] ?? 5,
        likesPerDay: likesPerDay?.[0] ?? 25,
        matchesPerWeek: Math.max(0, parseInt(String(matchesPerWeek || "10"), 10) || 10),
        matchPreference: "city", // UI doesn't expose this mapping; default to city-wise
        expireAfter: Math.max(1, Math.min(60, parseInt(String(expireAfter || "30"), 10) || 30)),
        autoRegenerate,
        contentSource: "custom",
        contentFileUrl: contentFileUrl || undefined,
      };
      const res = await fetch("/api/ai-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data?.ok) {
        showToast(`Generated ${body.numberOfProfiles} profile(s) successfully`);
        onCreated?.();
      } else {
        showToast(data?.error || "Generation failed");
      }
    } catch (e: any) {
      showToast(e?.message || "Generation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[32px] bg-bg-card p-4 md:p-8 border-none">
      {toastMsg && (
        <div className="fixed right-4 bottom-4 z-50 bg-black/80 text-white text-sm px-4 py-2 rounded-md shadow-md">
          {toastMsg}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="heading-small text-black text-[16px] md:text-[18px]">Generate New AI Profiles</h2>
          <RobotFormIcon width={33} height={33} />
        </div>
        <Button 
          onClick={handleGenerate}
          className="bg-gradient-to-r from-[#E17CFD] to-[#8950FC] hover:from-[#E17CFD]/90 hover:to-[#8950FC]/90 text-white h-auto px-6 md:px-8 py-3 rounded-[10px] generate-button-text w-full md:w-auto"
        >
          Generate
        </Button>
      </div>

      {/* Separator line */}
      <div className="h-[1px] bg-border-light mb-4 md:mb-8" />

      {/* Form Grid with Lifecycle spanning multiple rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-[20px] gap-y-[17px]">
        {/* Row 1 */}
        <div className="flex flex-col gap-[8px]">
          <label className="form-label">Name of Profile</label>
          <Input
            type="text"
            placeholder="Enter profile name"
            className="h-[44px] rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] shadow-none"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-[8px]">
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
        <div className="flex flex-col gap-[8px]">
          <div className="flex items-center justify-between">
            <label className="slider-label">Message per day</label>
            <span className="slider-value">{messagesPerDay[0]}/day</span>
          </div>
          <div className="flex flex-col gap-[4px]">
            <Slider
              value={messagesPerDay}
              onValueChange={setMessagesPerDay}
              max={20}
              step={1}
              className="w-full [&_.slider-track]:bg-gray-200 [&_.slider-range]:bg-primary-purple [&_[role=slider]]:bg-primary-purple [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:rounded-full"
            />
            <div className="flex justify-between items-center">
              <span className="slider-minmax">0</span>
              <span className="slider-minmax">20</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-[8px]">
          <div className="flex items-center justify-between">
            <label className="slider-label">Likes Per day</label>
            <span className="slider-value">{likesPerDay[0]}/day</span>
          </div>
          <div className="flex flex-col gap-[4px]">
            <Slider
              value={likesPerDay}
              onValueChange={setLikesPerDay}
              max={50}
              step={1}
              className="w-full [&_.slider-track]:bg-gray-200 [&_.slider-range]:bg-primary-purple [&_[role=slider]]:bg-primary-purple [&_[role=slider]]:border-2 [&_[role=slider]]:border-white [&_[role=slider]]:rounded-full"
            />
            <div className="flex justify-between items-center">
              <span className="slider-minmax">0</span>
              <span className="slider-minmax">50</span>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-col gap-[8px]">
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
        <div className="flex flex-col gap-[8px]">
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
        <div className="flex flex-col gap-[8px]">
          <label className="form-label">Matches allow per week</label>
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
        <div className="lg:row-span-3 flex flex-col gap-[8px] md:col-span-2 lg:col-span-1">
          <label className="slider-label">Lifecycle</label>
          <div className="flex flex-col gap-[10px] p-[16px] bg-white rounded-[32px] border-none h-full">
            <span className="lifecycle-subtitle">Set their life period</span>
            <div className="flex flex-col gap-[10px]">
              <div className="flex flex-col gap-[8px]">
                <label className="form-label">Expire after</label>
                <Select value={expireAfter} onValueChange={setExpireAfter}>
                  <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-[8px]">
                <label className="form-label">Auto delete</label>
                <div className="flex items-center gap-[8px]">
                  <Checkbox 
                    id="auto-delete"
                    checked={autoRegenerate}
                    onCheckedChange={(checked) => setAutoRegenerate(checked as boolean)}
                    className="w-[24px] h-[24px] rounded-[4px] border-primary-purple data-[state=checked]:bg-primary-purple data-[state=checked]:border-primary-purple"
                  />
                  <label 
                    htmlFor="auto-delete" 
                    className="form-label cursor-pointer"
                  >
                    Auto-regenerate after expiry
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3 */}
        <div className="flex flex-col gap-[8px]">
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
        <div className="flex flex-col gap-[8px]">
          <label className="form-label">Content/Photo Source</label>
          <Select value={contentSource} onValueChange={(v) => setContentSource(v)}>
            <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {contentSource === "custom" && (
            <div className="flex flex-col gap-[6px]">
              <Input type="file" accept="image/*" className="h-[44px] rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] shadow-none" onChange={handleFileChange} />
              <span className="form-input-text text-xs">
                {uploading ? "Uploading..." : contentFileUrl ? "File uploaded" : "Choose an image to upload"}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-[8px]">
          <label className="form-label">No of Profiles</label>
          <Input
            type="text"
            value={numberOfProfiles}
            onChange={(e) => setNumberOfProfiles(e.target.value)}
            className="h-[44px] rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] shadow-none"
          />
        </div>

        {/* Row 4 */}
        <div className="flex flex-col gap-[8px]">
          <label className="form-label">Location</label>
          <Select value={selectedCountry} onValueChange={(v) => { setSelectedCountry(v); setSelectedCity(""); }}>
            <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
              <div className="flex items-center gap-[10px] flex-1">
                <span className="form-input-text">Country</span>
                <span className="form-input-text">{countries.find(c => c.code === selectedCountry)?.name || "Select"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-[8px]">
          <label className="form-label">City</label>
          <Select value={selectedCity} onValueChange={(v) => setSelectedCity(v)}>
            <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
              <div className="flex items-center gap-[10px] flex-1">
                <span className="form-input-text">City</span>
                <span className="form-input-text">{selectedCity || "Select"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {cities.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-[8px]">
          <label className="form-label">Match Preferences</label>
          <Select>
            <SelectTrigger className="h-[44px] w-full rounded-[4px] border border-[rgba(113,102,249,0.47)] bg-white form-input-text px-[8px] gap-[10px] shadow-none">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="nearby">Nearby</SelectItem>
              <SelectItem value="verified">Verified Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}