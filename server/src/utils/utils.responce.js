const responceHandler = (res, satatusCode, success, message, data = null, error = null) => {
    return res.status(satatusCode).json({
        success,
        message,
        ...data,
        error
    })
}

export const sendResponce = responceHandler;