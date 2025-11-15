import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../main";

const SignUp = () => {
  let navigate = useNavigate();

  const [show, setShow] = useState(false);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  let [loading,setLoading] = useState(false);
   let [error,setError] = useState(false);
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/signup`,
        {
          userName,
          email,
          password,
        },
        { withCredentials: true }
      );

      console.log("Success:", result.data);
       setEmail("");
      setPassword("");
      setUserName("");
      setLoading(false);
      setError(false);
    } catch (error) {
      console.log("Error details:", error.response?.data);
      console.log("Status:", error.response?.status);
            setLoading(false);
            setError(error?.response?.data?.message);
    }
  };

  return (
    <div className="w-full h-[100vh] bg-slate-200 flex items-center justify-center">
      <div className="w-full max-w-[500px] h-[600px] bg-white rounded-lg shadow-gray-200 shadow-lg flex flex-col gap-[30px]">
        <div className="w-full h-[200px] bg-[#19cdff] rounded-b-[30%] shadow-gray-200 shadow-lg flex items-center justify-center">
          <h1 className="text-gray-600 font-bold text-[30px]">
            Welcome to <span className="text-white">Chatly</span>
          </h1>
        </div>
        <form
          action=""
          className="w-full flex flex-col gap-[20px] items-center"
          onSubmit={handleSignUp}
        >
          <input
            type="text"
            placeholder="username"
            className="w-[90%] h-[50px] outline-none border-2 border-[#20c7ff]
          px-[20px] py-[10px] bg-[white] rounded-lg text-[19px]"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <input
            type="email"
            placeholder="email"
            className="w-[90%] h-[50px] outline-none border-2 border-[#20c7ff]
          px-[20px] py-[10px] bg-[white] rounded-lg text-[19px]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="w-[90%] h-[50px] border-2 border-[#20c7ff] overflow-hidden rounded-lg relative">
            <input
              type={show ? "text" : "password"}
              placeholder="password"
              className="w-full h-full outline-none  px-[20px] py-[10px] bg-[white] shadow-gray-200 shadow-lg text-[19px]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span
              className="absolute right-[10px] top-[10px] text-[19px] text-[#20c7ff]"
              onClick={() => setShow((prev) => !prev)}
            >{`${show ? "hidden" : "show"}`}</span>
          </div>
          {error && <p className="text-red-500">*{error}</p>}
          <button className="text-[20px] w-[200px] mt-[20px] font-bold px-[20px] py-[10px] bg-[#20c7ff] rounded-2xl shadow-gray-200 shadow-lg hover:shadow-inner font-semibold" disabled={loading}>
            {loading ? "loading" : "Sign up"}
          </button>
          <p className="cursor-pointer" onClick={() => navigate("/login")}>
            Already have an account?{" "}
            <span className="text-[#20c7ff] text-[bold]">Login</span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
