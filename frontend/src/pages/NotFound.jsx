import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import StateMessage from "../components/StateMessage.jsx";

function NotFound() {
  return (
    <StateMessage icon={Compass} title="This page wandered off" text="The page you are looking for doesn't exist or has moved.">
      <Link to="/home" className="btn btn-primary">
        Back to the shop
      </Link>
    </StateMessage>
  );
}

export default NotFound;
