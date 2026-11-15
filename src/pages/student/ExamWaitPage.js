import { useNavigate, useParams } from "react-router-dom";

// TODO(5단계): 시험 정보, 서버 시각 보정 카운트다운, 30초 재동기화, 0초에 문항 API 호출
export default function ExamWaitPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  return (
    <main className="page">
      <h1>시험 대기</h1>
      <p className="placeholder">시험 {examId}의 정보와 카운트다운이 들어갈 자리</p>
      <button className="btn btn-primary" onClick={() => navigate(`/exam/${examId}/take`)}>
        (임시) 시험 시작
      </button>
    </main>
  );
}
