import { UserButton } from '@clerk/nextjs'

const Home = () => {
	return (
		<div>
			<p>HOME</p>
			<UserButton afterSignOutUrl='/' />
		</div>
	)
}

export default Home
