export function Footer() {
  return (
    <footer class="site-footer">
      <div class="site-footer__inner">
        <p>&copy; {new Date().getFullYear()} AgentClinic</p>
        <nav aria-label="Footer navigation">
          <a href="/feedback">Feedback</a>
        </nav>
      </div>
    </footer>
  );
}
