/**
 * TransformationForm component renders a form to configure image transformations.
 * Allows user to set title, aspect ratio, prompt, and other properties.
 * Handles form submission and transformation requests.
 */
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useEffect, useState, useTransition } from 'react'
import { CustomField } from './CustomField'
import {
	AspectRatioKey,
	dataUrl,
	debounce,
	deepMergeObjects,
} from '@/lib/utils'
import { set } from 'mongoose'
import MediaUploader from './MediaUploader'
import TransformedImage from './TransformedImage'
import { updateCredits } from '@/lib/actions/user.actions'
import { getCldImageUrl } from 'next-cloudinary'
import { addImage, updateImage } from '@/lib/actions/image.actions'
import { useRouter } from 'next/navigation'
import { InsufficientCreditsModal } from './InsufficientCreditsModal'

import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'

import { Input } from '@/components/ui/input'
import {
	aspectRatioOptions,
	creditFee,
	defaultValues,
	transformationTypes,
} from '@/constants'

export const formSchema = z.object({
	title: z.string(),
	aspectRatio: z.string().optional(),
	color: z.string().optional(),
	prompt: z.string().optional(),
	publicId: z.string(),
})

const TransformationForm = ({
	action,
	data = null,
	userId,
	type,
	creditBalance,
	config = null,
}: TransformationFormProps) => {
	const transformationType = transformationTypes[type]
	const [image, setImage] = useState(data)
	const [newTransformation, setNewTransformation] =
		useState<Transformations | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isTransforming, setIsTransforming] = useState(false)
	const [transformationConfig, setTransformationConfig] = useState(config)
	const [isPending, startTransition] = useTransition()
	const router = useRouter()

	const initialValues =
		data && action === 'Update'
			? {
					title: data?.title,
					aspectRatio: data?.aspectRatio,
					color: data?.color,
					publicId: data?.publicId,
					prompt: data?.prompt,
			  }
			: defaultValues

	// 1. Define your form.
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: initialValues,
	})

	// 2. Define a submit handler.
	/**
	 * Submits the form and handles the add/update image action based on the form values.
	 * If adding a new image, it will reset the form and navigate to the new image page on success.
	 * If updating an existing image, it will navigate to the existing image page on success.
	 */
	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsSubmitting(true)

		if (data || image) {
			const transformationUrl = getCldImageUrl({
				width: image?.width,
				height: image?.height,
				src: image?.publicId,
				...transformationConfig,
			})

			const imageData = {
				title: values.title,
				publicId: image?.publicId,
				transformationType: type,
				width: image?.width,
				height: image?.height,
				config: transformationConfig,
				secureURL: image?.secureURL,
				transformationURL: transformationUrl,
				aspectRatio: values.aspectRatio,
				prompt: values.prompt,
				color: values.color,
			}

			if (action === 'Add') {
				try {
					const newImage = await addImage({
						image: imageData,
						userId,
						path: '/',
					})

					if (newImage) {
						form.reset()
						setImage(data)
						router.push(`/transformations/${newImage._id}`)
					}
				} catch (error) {
					console.log(error)
				}
			}
			if (action === 'Update') {
				try {
					const updatedImage = await updateImage({
						image: {
							...imageData,
							_id: data?._id,
						},
						userId,
						path: `/transformations/${data?._id}`,
					})

					if (updatedImage) {
						router.push(`/transformations/${updatedImage._id}`)
					}
				} catch (error) {
					console.log(error)
				}
			}
		}

		setIsSubmitting(false)
	}

	/**
	 * Handles selecting a field value from the aspect ratio options.
	 * Updates the image state with the new aspect ratio, width, and height.
	 * Also updates the transformation config state.
	 * Finally calls the onChangeField callback with the new value.
	 */
	const onSelectFieldHandler = (
		value: string,
		onChangeField: (value: string) => void
	) => {
		const imageSize = aspectRatioOptions[value as AspectRatioKey]

		setImage((prevState: any) => ({
			...prevState,
			aspectRatio: imageSize.aspectRatio,
			width: imageSize.width,
			height: imageSize.height,
		}))

		setNewTransformation(transformationType.config)
		return onChangeField(value)
	}

	/**
	 * Handles transforming the image when the transform button is clicked.
	 * Sets the isTransforming state to true to show a loading indicator.
	 * Merges the latest transformation config into the existing config.
	 * Clears the newTransformation state.
	 * Starts a transition to update credits.
	 * Sets isTransforming to false when done to hide loading indicator.
	 */
	const onTransformHandler = async () => {
		setIsTransforming(true)

		setTransformationConfig(
			deepMergeObjects(newTransformation, transformationConfig)
		)

		setNewTransformation(null)

		startTransition(async () => {
			await updateCredits(userId, creditFee)
		})
	}

	/**
	 * Handles input change for transformation form fields.
	 * Debounces calling setNewTransformation to update transformation config.
	 * Calls onChangeField callback with new value.
	 */
	const onInputChangeHandler = (
		fieldName: string,
		value: string,
		type: string,
		onChangeField: (value: string) => void
	) => {
		debounce(() => {
			setNewTransformation((prevState: any) => ({
				...prevState,
				[type]: {
					...prevState?.[type],
					[fieldName === 'prompt' ? 'prompt' : 'to']: value,
				},
			}))
		}, 1000)()

		console.log(type)
		return onChangeField(value)
	}

	/**
	 * Updates the newTransformation state with the default config
	 * when the image loads or the transformation type changes,
	 * for "restore" and "removeBackground" types.
	 */
	useEffect(() => {
		if (image && (type === 'restore' || type === 'removeBackground')) {
			setNewTransformation(transformationType.config)
		}
	}, [image, transformationType.config, type])

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
				{creditBalance < Math.abs(creditFee) && <InsufficientCreditsModal />}
				<CustomField
					control={form.control}
					name='title'
					formLabel='Image Title'
					className='w-full'
					render={({ field }) => <Input {...field} className='input-field' />}
				/>

				{type === 'fill' && (
					<CustomField
						control={form.control}
						name='aspectRatio'
						formLabel='Aspect Ratio'
						className='w-full'
						render={({ field }) => (
							<Select
								onValueChange={(value) =>
									onSelectFieldHandler(value, field.onChange)
								}
								value={field.value}
							>
								<SelectTrigger className='select-field'>
									<SelectValue placeholder='Select size' />
								</SelectTrigger>
								<SelectContent>
									{Object.keys(aspectRatioOptions).map((key) => (
										<SelectItem key={key} value={key} className='select-item'>
											{aspectRatioOptions[key as AspectRatioKey].label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				)}

				{(type === 'remove' || type === 'recolor') && (
					<div className='prompt-field'>
						<CustomField
							control={form.control}
							name='prompt'
							formLabel={
								type === 'remove' ? 'Object to remove' : 'Object to recolor'
							}
							className='w-full'
							render={({ field }) => (
								<Input
									value={field.value}
									className='input-field'
									onChange={(e) =>
										onInputChangeHandler(
											'prompt',
											e.target.value,
											type,
											field.onChange
										)
									}
								/>
							)}
						/>

						{type === 'recolor' && (
							<CustomField
								control={form.control}
								name='color'
								formLabel='Replacement Color'
								className='w-full'
								render={({ field }) => (
									<Input
										value={field.value}
										className='input-field'
										onChange={(e) =>
											onInputChangeHandler(
												'color',
												e.target.value,
												'recolor',
												field.onChange
											)
										}
									/>
								)}
							/>
						)}
					</div>
				)}

				<div className='media-uploader-field'>
					<CustomField
						control={form.control}
						name='publicId'
						className='flex size-full flex-col'
						render={({ field }) => (
							<MediaUploader
								onValueChange={field.onChange}
								setImage={setImage}
								publicId={field.value}
								image={image}
								type={type}
							/>
						)}
					/>

					<TransformedImage
						image={image}
						type={type}
						title={form.getValues().title}
						isTransforming={isTransforming}
						setIsTransforming={setIsTransforming}
						transformationConfig={transformationConfig}
					/>
				</div>

				<div className='flex flex-col gap-4'>
					<Button
						type='button'
						className='submit-button capitalize'
						disabled={isTransforming || newTransformation === null}
						onClick={onTransformHandler}
					>
						{isTransforming ? 'Transforming...' : 'Apply transformation'}
					</Button>
					<Button
						type='submit'
						className='submit-button capitalize'
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Submitting...' : 'Save image'}
					</Button>
				</div>
			</form>
		</Form>
	)
}
export default TransformationForm
