/*This file is very important in a React full-stack app because it handles authentication globally using Context API + Axios + React Router. */

/*This file creates an authentication system provider that:
registers users
logs users in
stores token in localStorage
shares auth data across the entire React app
==> Basically this file let every component know wether a user is logged in or not*/

import axios from "axios"; /*Used to send API requests to backend allows your frontend to talk with your backend or any other server*/
import {
  createContext,
  useContext,
  useState,
} from "react"; /*1)Creates a global storage area so all components can access login info.
2)Used to read values from context
3)Stores user authentication data */
import { useNavigate } from "react-router-dom"; /*Used for page redirection (login successful → redirect dashboard) */
import httpStatus from "http-status"; /*Cleaner way to check API response status*/
import server from "../environment";

export const AuthContext = createContext({});
/*This export from this file is used inside authentication.jsx */
/*This creates global auth container ,Later entire app can access This is the actual Context object think of it like "AuthContext = container blueprint"...basically Creates empty global storage.
If any component tries to use useContext(AuthContext) without being wrapped inside AuthProvider, it will receive {} instead of crashing.*/

const client = axios.create({
  baseURL: `${server}/api/v1/users`,
}); /*Instead of writing:
axios.post("http://localhost:8000/api/v1/users/register")
every time
you created shortcut: client.post("/register") */

export const AuthProvider = ({ children }) => {
  /*This component wraps entire app providing app the access to the authentication system */

  // const authContext = useContext(AuthContext);
  
  /*This means "Read current value stored inside AuthContext
and store it inside authContext variable" this is simply "authContext = value inside AuthContext" in one simple line "useContext() reads global shared data created using createContext()."*/

  const [userData, setUserData] = useState(null);

  const router =
    useNavigate(); /*Creates navigation controller e.g.-- " router("/dashboard") "*/

  /*useNavigate() is a React hook that gives you a function you can use to move the user to another route from JavaScript code, instead of clicking a link.It comes from react-router-dom.example 
login success → redirect user to home page
logout success → redirect user to login page
That’s exactly where useNavigate() helps
Since AuthContext is global, it can control navigation from anywhere
*/

  const handleRegister = async (name, username, password) => {
    try {
      let request = await client.post("/register", {
        name: name,
        username: username,
        password: password,
      }); /*API request  sends: POST /api/v1/users/register ....also you MUST KNOW THAT axios.post() → returns Promise but
      await axios.post() → returns resolved response object*/

      /*client.post() returns a promise, but await client.post() returns the resolved response object from the server, which Axios stores inside the variable "request".*/

      
      if (request.status === httpStatus.CREATED) {
        return request.data.message;
      }
    } catch (err) {
      throw err; /*Pass error to component that called function*/
    }
  };

  const handleLogin = async (username, password) => {
    try {
      let request = await client.post("/login", {
        username: username,
        password: password,
      });
      if (request.status === httpStatus.OK) {
        localStorage.setItem(
          "token",
          request.data.token,
        ); /*Stores JWT token inside browser this keeps use logged in even after refresh*/

        router("/home");
      }
    } catch (err) {
      throw err;
    }
  };

  const getHistoryOfUser = async () => {
    try {
      let request = await client.get("/get_all_activity", {
        params: {
          token: localStorage.getItem("token"),
        } /*this second paramete add a query string to url in this token is added and the url becomes "http://localhost:8000/api/v1/users/get_all_activity?token=YOUR_TOKEN_HERE" */,
      });
      return request.data;
    } catch (err) {
      throw err;
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      let request = await client.post("/add_to_activity", {
        token: localStorage.getItem("token"),
        meeting_code: meetingCode,
      });
      return request;
    } catch (e) {
      throw e;
    }
  };

  const data = {
    userData,
    setUserData,
    addToUserHistory,
    getHistoryOfUser,
    handleRegister,
    handleLogin,
  }; /*This object/"data" becomes globally accessible */

  return (
    <AuthContext.Provider value={data}>{children}</AuthContext.Provider>
  ); /*This makes auth system available everywhere inside: children 
  Example structure:
<AuthProvider>
   Navbar
   LoginPage
   Dashboard
</AuthProvider> */
};
/*This export from this file is used inside App.js file  */

/*createContext() = create locker
Provider = put items in locker
useContext() = take items from locker */

/*AuthProvider wraps the application and supplies authentication data through AuthContext.Provider so that all child components can access it globally using useContext(). */

/*Used only if component tries to read context without Provider
Example:
<Login />
outside:
<AuthProvider>
Then:
useContext(AuthContext)
returns:
{}
instead of crashing
So it's a safety fallback. */

/*interview level == "createContext() creates a global data container in React so multiple components can share values without passing props manually through every level. " */

/*createContext() → creates blueprint
AuthProvider → fills blueprint with data
AuthContext.Provider → distributes data
useContext(AuthContext) → reads distributed data
authContext → variable storing received data */
