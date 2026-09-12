import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware

model = joblib.load('Student_Employbility_Score.pkl')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


class Student(BaseModel):
    major                      : Literal['Computer Science', 'Software Engineering', 'Artificial Intelligence', 'Data Science', 'Cybersecurity', 'Information Technology', 'Business Analytics', 'Electrical Engineering']
    cgpa                       : float = Field(..., ge=2.0, le=4.0, description="Cumulative Grade Point Average (CGPA) on a scale of 2 to 4.")
    academic_performance       : Literal[ 'Poor', 'Average', 'Good', 'Excellent']
    programming_skill          : int = Field(..., ge=1, le=10, description="Programming skill level on a scale of 1 to 10.")
    gitHub_profile             : Literal['Yes', 'No']
    internships                : int = Field(..., ge=0, le=5, description="Number of internships completed.")
    resume_score               : int = Field(..., ge=44, le=100, description="Resume score on a scale of 44 to 100.")
    communication_skills       : int = Field(..., ge=3, le=10, description="Communication skills level on a scale of 3 to 10.")
    problem_solving            : int = Field(..., ge=1, le=10, description="Problem-solving ability on a scale of 1 to 10.")
    english_proficiency        : Literal['Basic', 'Intermediate', 'Advanced']
    interview_score            : int = Field(..., ge=17, le=100, description="Interview performance score on a scale of 17 to 100.")


class PredictionResponse(BaseModel):
    predicted_employability_score: float

@app.get('/')
def greeting():
    return {"Welcome to the Student Employability Score Prediction API!"}

@app.post('/predict', response_model=PredictionResponse)
def predict(data: Student):
    input_data = pd.DataFrame([{
        'Major'                : data.major,
        'CGPA'                 : data.cgpa,
        'Academic_Performance' : data.academic_performance,
        'Programming_Skill'    : data.programming_skill,
        'GitHub_Profile'       : data.gitHub_profile, 
        'Internships'          : data.internships,
        'Resume_Score'         : data.resume_score,
        'Communication_Skills' : data.communication_skills,
        'Problem_Solving'      : data.problem_solving, 
        'English_Proficiency'  : data.english_proficiency, 
        'Interview_Score'      : data.interview_score
    }])
    prediction = model.predict(input_data)[0]
    return PredictionResponse(predicted_employability_score=round(float(prediction), 2))