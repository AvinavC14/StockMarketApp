import Recommendations from '@/components/Recommendations';

const RecommendationsPage = () => {
  return (
    <section className="flex min-h-screen p-4 md:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <Recommendations />
      </div>
    </section>
  );
};

export default RecommendationsPage;