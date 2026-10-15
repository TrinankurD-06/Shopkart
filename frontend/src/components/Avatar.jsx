import { useState } from "react";
import { initials } from "../utils/format.js";

// Google profile photo when there is one, otherwise the customer's initials
function Avatar({ user, as: Tag = "span" }) {
  const [broken, setBroken] = useState(false);
  return (
    <Tag className="avatar">
      {user.avatarUrl && !broken ? (
        <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        initials(user.fullName)
      )}
    </Tag>
  );
}

export default Avatar;
