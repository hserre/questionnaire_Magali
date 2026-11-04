import React, { useEffect, useState } from "react";
import {styleBoutonContinuer } from "./InterfaceUtils"; // Votre fichier contenant les composants de la croix
import { API_URL } from "../config";

export default function CheckEmail({onComplete }) {
    const [emails, setEmails] = useState([]);
    const [codes, setCodes] = useState([]);
    const [codesUsed, setCodesUsed] = useState([]);
    const [pageCode,setPageCode] = useState(false);
    const [texte, setTexte] = useState("");

    useEffect(() => {
        fetch(`${API_URL}/api/stimuli/checkEmail`)
            .then((res) => res.json())
            .then((data) => setEmails(data))
            .catch((err) => console.error(err));
    }, []);


    useEffect(() => {
        fetch(`${API_URL}/api/stimuli/checkCodes`)
            .then((res) => res.json())
            .then((data) => setCodes(data))
            .catch((err) => console.error(err));
    }, []);

    useEffect(() => {
        fetch(`${API_URL}/api/stimuli/checkCodesUsed`)
            .then((res) => res.json())
            .then((data) => setCodesUsed(data))
            .catch((err) => console.error(err));
    }, []);

    const setCode = (codeInput) =>{
        if (codes.some(c => c.code === codeInput) && !codesUsed.some(c => c.code === codeInput)){
            onComplete();
            return;
        }else{
            alert("Oups! Ce code est incorrect."); 
            return;
    }}

     const checkEmail = (emailInput) => {
        console.log(emails);
        console.log(codes);
        console.log(codesUsed);
        if (emails.some(e => e.email === emailInput)) {
             alert("Tu as déjà passé ce test, merci pour ta participation!");
             return true;
            } else {
                setPageCode(true);
            }};
   

    const saveData = (text) => {

        fetch(`${API_URL}/api/checkEmail`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
            email:text
            }),
        }).catch((err) => console.error(err));
    };

    if (!pageCode) {
        return(
            <>

            {/* Instructions */}
            <p
                style={{
                    fontSize: "32px",
                    textAlign: "center",
                    marginTop: "80px",
                    marginBottom: "60px",
                    lineHeight:'40px'
                }}
            >
            Tape ton email. Nous t'enverrons un code que tu entreras dans la page suivante. </p>

            <br />
            <br />

            <input
                type="text"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                onKeyDown={(e) => {
                }}
                placeholder="Tapez ici"
                style={{
                    height: "5vh",
                    fontSize: "3vh",
                    width: "35vw",
                    justifyContent: "center",
                    textAlign: "center"
                }}
            />
            <button
                onClick={() => {
                        checkEmail(texte);
                    }
                }
                style={styleBoutonContinuer}
            >
                Continue
            </button>
        </>
        )  
    }

    return(
        <>

        {/* Instructions */}
        <p
            style={{
                fontSize: "32px",
                textAlign: "center",
                marginTop: "80px",
                marginBottom: "60px",
                lineHeight:'40px'
            }}
        >
        Tape le code que tu as reçu.
        </p>
        <br />
        <br />

        <input
            type="text"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => {
            }}
            placeholder="Tapez ici"
            style={{
                height: "5vh",
                fontSize: "3vh",
                width: "35vw",
                justifyContent: "center",
                textAlign: "center"
            }}
        />
        <button
            onClick={() => {
                    setCode(texte);
                }
            }
            style={styleBoutonContinuer}
        >
            Continue
        </button>
    </>
    ) 
}