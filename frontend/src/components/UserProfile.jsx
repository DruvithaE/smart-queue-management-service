import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { getUserProfile, updateUserMembers } from "../api";

export default function UserProfile() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [members, setMembers] = useState({
    member1: "",
    member2: "",
    member3: "",
    member4: "",
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      const data = await getUserProfile(user.id);
      setProfile(data);
      setMembers({
        member1: data.member1 || "",
        member2: data.member2 || "",
        member3: data.member3 || "",
        member4: data.member4 || "",
      });
    };

    load();
  }, [user.id]);

  const handleSave = async () => {
    const updated = await updateUserMembers(user.id, members);
    setProfile(updated);
    setMsg("Members updated successfully!");
  };

  if (!profile) return <div style={{ padding: 24 }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: 700, margin: "30px auto", padding: 24 }}>
      <div
        style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(10px)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>👤 My Profile</h2>

        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Role:</strong> {profile.role}</p>
        <p><strong>No. of Members:</strong> {profile.no_of_members}</p>

        <h3 style={{ marginTop: 24 }}>Family / Group Members</h3>

        {["member1", "member2", "member3", "member4"].map((field, index) => (
          <input
            key={field}
            placeholder={`Member ${index + 1} name`}
            value={members[field]}
            onChange={(e) =>
              setMembers((prev) => ({ ...prev, [field]: e.target.value }))
            }
            style={{
              width: "100%",
              padding: "10px 12px",
              marginBottom: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              boxSizing: "border-box",
            }}
          />
        ))}

        {msg && <p style={{ color: "#16a34a", fontWeight: 600 }}>{msg}</p>}

        <button
          onClick={handleSave}
          style={{
            padding: "10px 18px",
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Save Members
        </button>
      </div>
    </div>
  );
}