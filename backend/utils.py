import pandas as pd
import random
import sqlite3
import os

# Dictionnaire pour mapper les étapes aux fichiers Excel correspondants
EXCEL_PATHS = {
    "Similitudes": "./Entry_data/input_similitudes.xlsx",
    "Similitudes_IT": "./Entry_data/input_similitudes_IT.xlsx",
    "Vocabulaire": "./Entry_data/input_vocabulaire.xlsx",
    "Vocabulaire_IT": "./Entry_data/input_vocabulaire_IT.xlsx",
    "Comprehension": "./Entry_data/input_comprehension.xlsx",
    "Comprehension_IT": "./Entry_data/input_comprehension_IT.xlsx",
    "Dictee": "./Entry_data/input_dictee.xlsx",
    "Dictee_IT": "./Entry_data/input_dictee_IT.xlsx"
}

def charger_essais_etape(etape: str, tour: int = None):
    if etape in {'Comprehension', 'Similitudes', 'Vocabulaire', 'Dictee'}:
        if tour==1:
            path = EXCEL_PATHS.get(etape + "_IT")
        elif tour==2:
            path = EXCEL_PATHS.get(etape)
        if not path:
            return []
        
        df = pd.read_excel(path)
        essais = []
        positionRep = 5
        for idx, row in df.iterrows():
            options=[0] * len(df)
            if etape=='Vocabulaire':
                if row['reponse'] not in [row['Distractor_1'], row['Distractor_2']]:
                    # Rassembler et mélanger les options de réponse
                    options = [row['reponse'], row['Distractor_1'], row['Distractor_2']]
                    random.shuffle(options)
                    compteur=0
                    while options.index(row['reponse']) == positionRep:
                        compteur += 1

                        if compteur > 1000:
                            print("BOUCLE SUSPECTE", row)
                            break

                        random.shuffle(options)
                    positionRep = options.index(row['reponse'])

                essai = {

                    "etape":etape,
                    "partie":row.get('partie',''),
                    "reponse":row.get('reponse',''),
                    "instructions":row.get('instructions',''),
                    "question":row.get('question',''),
                    "Distractor_1":row.get('Distractor_1',''),
                    "Distractor_2":row.get('Distractor_2',''),
                    "option1": options[0],
                    "option2": options[1],
                    "option3": options[2],
                }
                essais.append(essai)
            
            # Diviser en deux groupes pour l'affichage (colonne 1 et colonne 2)
            #col1 = options[:2]
            #col2 = options[2:]
            #if etape=='Dictee':
            #    essai = {
            #                    "phrase":row.get('phrase',''),
            #                    "audio":row.get('audio',''),
            #    }
            #    essais.append(essai)
            else:
                essai = {

                    "etape":etape,
                    "partie":row.get('partie',''),
                    "reponse":row.get('reponse',''),
                    "instructions":row.get('instructions',''),
                    "question":row.get('question',''),
                    "Distractor_1":row.get('Distractor_1',''),
                    "Distractor_2":row.get('Distractor_2',''),
                    "option1": options[0],
                    "option2": options[1],
                    "option3": options[2],
                }
                essais.append(essai)
        return essais
    
    elif etape=='checkEmail':
        conn = sqlite3.connect("./bases_Magali.db")

        df = pd.read_sql_query("SELECT * FROM emails", conn)

        conn.close()

        emails = []
        for idx, row in df.iterrows():    
            email = {
                "email":row.get('email','')
            }
            emails.append(email)
        return emails
    elif etape=='checkCodes':
        path = "./Entry_data/codes.xlsx"
        if not path:
            return []
        
        df = pd.read_excel(path)

        codes = []
        for idx, row in df.iterrows():
            code = {
                "code":int(row.get('codes',0))
            }
            codes.append(code)
        return codes
    elif etape=='checkCodesUsed':
        path = './Entry_data/codesUsed.xlsx'
        if not path:
            return []
        
        df = pd.read_excel(path)

        codesUsed = []
        for idx, row in df.iterrows():
            codeUsed = {
                "code":int(row.get('codesUsed',0))
            }
            codesUsed.append(codeUsed)
        return codesUsed
