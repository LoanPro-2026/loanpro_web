import ErrorPage from '@/components/ErrorPage';

export default function NotFound() {
  return (
    <ErrorPage 
      code={404}
      title="Page Not Found"
      description="The page you are looking for doesn't exist or has been moved. It might have been deleted or the URL might be incorrect."
    />
  );
}
