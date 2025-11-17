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

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa',
  'Benue','Borno','Cross River','Delta','Ebonyi','Edo',
  'Ekiti','Enugu','FCT (Abuja)','Gombe','Imo','Jigawa','Kaduna',
  'Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers',
  'Sokoto','Taraba','Yobe','Zamfara',
];

const NIGERIAN_CITIES = [
  'Lagos','Abuja','Kano','Ibadan','Port Harcourt','Benin City',
  'Kaduna','Maiduguri','Zaria','Aba','Jos','Ilorin','Oyo',
  'Enugu','Abeokuta','Sokoto','Onitsha','Warri','Calabar',
  'Uyo','Akure','Bauchi','Katsina','Ado-Ekiti','Makurdi',
  'Minna','Lokoja','Keffi','Nnewi','Ogbomoso','Ikare',
  'Okene','Suleja','Kontagora','Bida','Umuahia','Awka',
  'Asaba','Owerri','Yenagoa','Dutse','Damaturu','Gombe',
  'Jalingo','Katsina-Ala','Lafia','Nasarawa','Wukari',
];

const COUNTRIES = [
  'Nigeria','Ghana','South Africa','Kenya','United Kingdom',
  'United States','Canada','Germany','France','Italy','Spain',
  'Netherlands','Belgium','Switzerland','Australia','New Zealand',
  'United Arab Emirates','Saudi Arabia','Qatar','Other',
];

const EDUCATION_LEVELS = [
  'Primary School',
  'Secondary School (WAEC/NECO)',
  'OND/HND',
  "Bachelor's Degree (BSc/BA)",
  "Master's Degree (MSc/MA)",
  'PhD',
  'Professional Certification',
  'Trade School',
  'Other',
];

const WORK_STATUSES = [
  'Employed (Private Sector)',
  'Employed (Government)',
  'Self-Employed',
  'Student',
  'NYSC',
  'Unemployed',
  'Retired',
  'Freelancer',
  'Business Owner',
  'Other',
];

const NIGERIAN_OCCUPATIONS = [
  'Software Engineer','Doctor','Nurse','Teacher','Banker','Accountant',
  'Lawyer','Engineer','Architect','Pharmacist','Journalist','Pilot',
  'Civil Servant','Business Owner','Trader','Farmer','Driver',
  'Mechanic','Electrician','Plumber','Carpenter','Tailor','Hair Stylist',
  'Chef','Waiter','Security Guard','Cleaner','Student','NYSC Member',
  'Unemployed','Retired','Freelancer','Consultant','Manager',
  'Sales Representative','Marketing Executive','HR Manager','IT Support',
  'Data Analyst','Project Manager','Real Estate Agent','Insurance Agent',
  'Other',
];

const NIGERIAN_ETHNICITIES = [
  'Hausa','Yoruba','Igbo','Fulani','Kanuri','Tiv','Ibibio',
  'Edo','Nupe','Ijaw','Urhobo','Efik','Igala','Idoma',
  'Itsekiri','Isoko','Anang','Ekoi','Bini','Esan',
  'Afemai','Owan','Akoko-Edo','Okpe','Uvwie','Udu','Ughievwen',
];

const CULTURAL_LANGUAGES = [
  'English','Hausa','Yoruba','Igbo','Fulani','Kanuri','Tiv',
  'Ibibio','Edo','Nupe','Ijaw','Urhobo','French','Arabic','Other',
];

const CULTURAL_RELIGIONS = [
  'Christianity',
  'Islam',
  'Traditional Religion',
  'Atheist',
  'Agnostic',
  'Other',
  'Prefer not to say',
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

  // Extended profile fields
  const [about, setAbout] = useState("");
  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [currentResidence, setCurrentResidence] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [genotype, setGenotype] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [workStatus, setWorkStatus] = useState("");
  const [occupation, setOccupation] = useState("");
  const [company, setCompany] = useState("");
  const [school, setSchool] = useState("");
  const [tribe, setTribe] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [religion, setReligion] = useState("");
  const [nationalIdUrl, setNationalIdUrl] = useState<string | null>(null);
  const [nationalIdUploading, setNationalIdUploading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
          // Extended fields
          setAbout(String(it.about || ""));
          setStateOfOrigin(String(it.state_of_origin || ""));
          setCurrentResidence(String(it.current_residence || ""));
          setCity(String(it.city || ""));
          setCountry(String(it.country || ""));
          setHeight(String(it.height || ""));
          setWeight(String(it.weight || ""));
          setBloodGroup(String(it.blood_group || ""));
          setGenotype(String(it.genotype || ""));
          setEducationLevel(String(it.education_level || ""));
          setWorkStatus(String(it.work_status || ""));
          setOccupation(String(it.occupation || ""));
          setCompany(String(it.company || ""));
          setSchool(String(it.school || ""));
          setTribe(String(it.tribe || ""));
          setPrimaryLanguage(String(it.primary_language || ""));
          setReligion(String(it.religion || ""));
          setNationalIdUrl(it.national_id ? String(it.national_id) : null);
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

  const handleNationalIdUpload = async (file?: File) => {
    if (!file) return;
    try {
      setNationalIdUploading(true);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads/user-photo", { method: "POST", body: form });
      const data = await res.json();
      if (data?.ok && data.url) setNationalIdUrl(data.url);
      else showToast(data?.error || "Upload failed");
    } catch (e: any) {
      showToast(e?.message || "Upload failed");
    } finally {
      setNationalIdUploading(false);
    }
  };

  const save = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      const payload: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
        email,
        birthday: birthDate,
        gender,
        about,
        national_id: nationalIdUrl,
        state_of_origin: stateOfOrigin,
        current_residence: currentResidence,
        city,
        country,
        height,
        weight,
        blood_group: bloodGroup,
        genotype,
        education_level: educationLevel,
        work_status: workStatus,
        occupation,
        company,
        school,
        tribe,
        primary_language: primaryLanguage,
        religion,
        interest: interests,
        photos: { main: photos[0] || null, gallery: photos },
        interestedIn,
        preferences: {
          interestedIn,
          ageRange: { min: ageRange[0], max: ageRange[1] },
          maxDistanceKm: maxDistance[0] || 0,
          goals,
          dealBreakers,
        },
      };
      if (password && password.length >= 6) {
        payload.password = password;
      }
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

            {/* Password Change */}
            <section className="mt-6">
              <h3 className="text-base md:text-lg font-semibold mb-3">Change Password (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="form-label">New Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="h-[42px]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="h-[42px]"
                  />
                </div>
              </div>
              {password && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-2">Passwords do not match</p>
              )}
            </section>

            {/* About & ID */}
            <section className="mt-6">
              <h3 className="text-base md:text-lg font-semibold mb-3">About & ID</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 flex flex-col gap-2">
                  <label className="form-label">About</label>
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Short bio or description"
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8950FC]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">National ID (Photo)</label>
                  <label className="rounded-xl border border-dashed flex flex-col items-center justify-center min-h-[120px] px-3 py-3 cursor-pointer text-xs text-muted-foreground">
                    {nationalIdUrl ? (
                      <div className="w-full flex flex-col items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={nationalIdUrl} alt="National ID" className="w-full h-28 object-cover rounded-lg" />
                        <span className="text-[11px]">Click to replace ID image</span>
                      </div>
                    ) : (
                      <span className="text-[11px]">Click to upload ID card or passport photo</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleNationalIdUpload(e.target.files?.[0] || undefined)}
                    />
                  </label>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {nationalIdUploading ? "Uploading ID..." : "Used for verification (not visible publicly)."}
                  </div>
                </div>
              </div>
            </section>

            {/* Location */}
            <section className="mt-6">
              <h3 className="text-base md:text-lg font-semibold mb-3">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="form-label">State of Origin</label>
                  <Select value={stateOfOrigin} onValueChange={setStateOfOrigin}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{NIGERIAN_STATES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Current State</label>
                  <Select value={currentResidence} onValueChange={setCurrentResidence}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{NIGERIAN_STATES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">City</label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>{NIGERIAN_CITIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Country</label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Physical Attributes */}
            <section className="mt-6">
              <h3 className="text-base md:text-lg font-semibold mb-3">Physical Attributes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="form-label">Height (cm)</label>
                  <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 175" className="h-[42px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Weight (kg)</label>
                  <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 70" className="h-[42px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Blood Group</label>
                  <Select value={bloodGroup} onValueChange={setBloodGroup}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Genotype</label>
                  <Select value={genotype} onValueChange={setGenotype}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {['AA','AS','SS','AC','SC','CC'].map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Occupation & Education */}
            <section className="mt-6">
              <h3 className="text-base md:text-lg font-semibold mb-3">Occupation & Education</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="form-label">Education Level</label>
                  <Select value={educationLevel} onValueChange={setEducationLevel}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{EDUCATION_LEVELS.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Work Status</label>
                  <Select value={workStatus} onValueChange={setWorkStatus}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{WORK_STATUSES.map((w) => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Occupation</label>
                  <Select value={occupation} onValueChange={setOccupation}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{NIGERIAN_OCCUPATIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Company</label>
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className="h-[42px]" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="form-label">School</label>
                  <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School or institution" className="h-[42px]" />
                </div>
              </div>
            </section>

            {/* Cultural Information */}
            <section className="mt-6">
              <h3 className="text-base md:text-lg font-semibold mb-3">Cultural Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="form-label">Tribe / Ethnicity</label>
                  <Select value={tribe} onValueChange={setTribe}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{NIGERIAN_ETHNICITIES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Primary Language</label>
                  <Select value={primaryLanguage} onValueChange={setPrimaryLanguage}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CULTURAL_LANGUAGES.map((l) => (<SelectItem key={l} value={l}>{l}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="form-label">Religion</label>
                  <Select value={religion} onValueChange={setReligion}>
                    <SelectTrigger className="h-[42px]"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CULTURAL_RELIGIONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
            </section>

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
