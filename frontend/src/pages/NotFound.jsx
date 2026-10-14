import { Link } from "react-router-dom";
import StateMessage from "../components/StateMessage.jsx";

function NotFound() {
  return (
    <StateMessage icon="🧭" title="Page not found" text="The page you are looking for doesn't exist.">
      <Link to="/home" className="btn btn-primary">
        Go Home
      </Link>
    </StateMessage>
  );
}

export default NotFound;
